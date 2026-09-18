/**
 * VSME — Plan 3 Task 24: the ONLY quotable VSME text, COPIED VERBATIM from prod by a
 * generator (scratchpad gen-vsme-quotes.mjs over `vsme.text.prior.json`, the read-only
 * full-text capture written by `scripts/verification/vsme-capture-text.mjs` on
 * 2026-09-18T19:08:52.204Z; JSON.stringify per cell, never retyped). There is NO
 * transcript of the VSME standard on disk; the compliance_requirements rows carry the
 * paragraph wording ("Para 29: „The undertaking shall …“" in `description`, the English
 * sentence with its printed page in `source_quote`) — grade EV (encoded, unverified
 * against the PDF), cited as `prod verification_quote (Para NN, <CR code>)`. Field
 * labels / units / worksheet titles are prod's own (EV) and name the register columns.
 * Quote carriers in prod (capture counts): compliance_requirements 31 / 31 with a "Para NN" description,
 * 9 / 31 with a source_quote naming the printed page; equations 10 / 10 with a source_quote (EQ-01 … EQ-10:
 * paras 24(e)(v) / 39(a), 30, 50 / 53, 109, 38(a) / (b), 168, 170, 63(c) — none names B2, the B7 materials
 * mass-flow, the C3 sector list, C7 or the B8 country metric) and 0 / 10 with a verification_quote; fields
 * 0 / 144 for both columns. Every paragraph cue this task uses is a
 * compliance_requirements cell (PROD_QUOTES); the remaining cues are prod worksheet titles / field labels
 * (PROD_WORKSHEETS / PROD_FIELDS, tagged vsme-U-1); the equation source_quotes are captured in PROD_EQUATIONS for the record.
 */
export type ProdQuote = { worksheet: string; id: string; severity: string; condition: string; condition_md5: string; clause: string; description: string; source_quote: string | null };
export const PROD_QUOTES: Record<string, ProdQuote> = {
 "VSME-CR-B01-01": {
  "worksheet": "VSME-B01.000",
  "id": "8a50b081-511d-470f-9337-92f69b1a08b1",
  "severity": "block",
  "condition": "BasisForPreparation IS NOT NULL",
  "condition_md5": "1fe1d7f311e5f70f5d729a1a143281da",
  "clause": "VSME B1 para 24(a)",
  "description": "Para 24(a): „The undertaking shall disclose which of the following options it has selected: OPTION A: Basic Module (only); or OPTION B: Basic Module and Comprehensive Module.“ Unbedingte Pflichtangabe (EFRAG-Template: „MISSING VALUE“ bis befüllt).",
  "source_quote": "VSME B1, §24 (p.8): \"The undertaking shall disclose: (a) which of the following options it has selected: i. OPTION A: Basic Module (only); or ii. OPTION B: Basic Module and Comprehensive Module;\""
 },
 "VSME-CR-B01-02": {
  "worksheet": "VSME-B01.000",
  "id": "b52f7056-7365-48f3-ac39-c103f63cd970",
  "severity": "block",
  "condition": "BasisForReporting IS NOT NULL",
  "condition_md5": "b4beab8fcdd95fa1de4c1db25f98eca6",
  "clause": "VSME B1 para 24(c)",
  "description": "Para 24(c): „… whether the sustainability report has been prepared on an individual basis … or on a consolidated basis …“ Unbedingte Pflichtangabe (EFRAG-Template: „MISSING VALUE“ bis befüllt).",
  "source_quote": "VSME B1, §24 (p.8): \"The undertaking shall disclose: ... (c) whether the sustainability report has been prepared on an individual basis (i.e. the report is limited to the undertaking's information only) or on a consolidated basis (i.e. the report includes information about the undertaking and its subsidiaries);\""
 },
 "VSME-CR-B01-03": {
  "worksheet": "VSME-B01.000",
  "id": "d44a7907-7a11-419e-af5c-7ccbac87c357",
  "severity": "warn",
  "condition": "UndertakingsLegalForm IS NOT NULL",
  "condition_md5": "12fe7d0e684b97dbffc320edbcf3c004",
  "clause": "VSME B1 para 24(e)",
  "description": "Para 24(e): „… the undertaking shall disclose … its legal form …“ Unbedingte Pflichtangabe; als Stammdatum beratend geführt (überschneidet sich mit der Registrierung).",
  "source_quote": null
 },
 "VSME-CR-B01-04": {
  "worksheet": "VSME-B01.000",
  "id": "890e2d88-a92d-4c36-897d-e2e7d9558862",
  "severity": "warn",
  "condition": "NaceSectorClassificationCodes IS NOT NULL",
  "condition_md5": "994ccf4cfc311a82bd827642ce3bf0c7",
  "clause": "VSME B1 para 24(e)",
  "description": "Para 24(e): „… NACE sector classification code(s) …“ Unbedingte Pflichtangabe; als Stammdatum beratend geführt.",
  "source_quote": null
 },
 "VSME-CR-B01-05": {
  "worksheet": "VSME-B01.000",
  "id": "dd0decd2-0076-4194-88ec-ba0a589f63af",
  "severity": "warn",
  "condition": "Assets IS NOT NULL",
  "condition_md5": "234105217deb0a9499a5786f13977e52",
  "clause": "VSME B1 para 24(e)",
  "description": "Para 24(e): „… the size of the balance sheet …“ Unbedingte Pflichtangabe; als Stammdatum beratend geführt.",
  "source_quote": null
 },
 "VSME-CR-B01-06": {
  "worksheet": "VSME-B01.000",
  "id": "11bd0179-31cc-4816-b688-465eee591a6d",
  "severity": "warn",
  "condition": "Turnover IS NOT NULL",
  "condition_md5": "10af9906cce2355321a3a80486fbc92d",
  "clause": "VSME B1 para 24(e)",
  "description": "Para 24(e): „… the turnover …“ Unbedingte Pflichtangabe; zugleich der Nenner der THG-Intensität (B3 para 31). Als Stammdatum beratend geführt.",
  "source_quote": null
 },
 "VSME-CR-B01-07": {
  "worksheet": "VSME-B01.000",
  "id": "e8a756bb-bb11-4af3-8f43-af5c7ed5be16",
  "severity": "warn",
  "condition": "NumberOfEmployees IS NOT NULL",
  "condition_md5": "cc6f27bb8241a0d3b88289907469c41b",
  "clause": "VSME B1 para 24(e)",
  "description": "Para 24(e): „… the number of employees in headcount or full-time equivalent (FTE) …“ Unbedingte Pflichtangabe; als Stammdatum beratend geführt.",
  "source_quote": null
 },
 "VSME-CR-B01-08": {
  "worksheet": "VSME-B01.000",
  "id": "f716ab76-d99a-4eb1-9091-159dcea911ba",
  "severity": "warn",
  "condition": "CountryOfPrimaryOperationsAndLocationOfSignificantAssets IS NOT NULL",
  "condition_md5": "d49e29f54c66de17c3ec6bd3250d3087",
  "clause": "VSME B1 para 24(e)",
  "description": "Para 24(e): „… the country of primary operations and the location of significant assets …“ Unbedingte Pflichtangabe; als Stammdatum beratend geführt.",
  "source_quote": null
 },
 "VSME-CR-B07-01": {
  "worksheet": "VSME-B01.000",
  "id": "8b65ebbb-4998-4dcf-b1e8-95a697b97e5b",
  "severity": "block",
  "condition": "UndertakingAppliesCircularEconomyPrinciples IS NOT NULL",
  "condition_md5": "63e1885f5f8ff94d6d2351ff4e8aa78f",
  "clause": "VSME B7 para 37",
  "description": "Para 37: „The undertaking shall disclose whether it applies circular economy principles …“ Die Ja/Nein-Angabe ist unbedingt (das „… and, if so, how …“ ist die bedingte Folgeangabe).",
  "source_quote": "VSME B7, §37 (p.10): \"The undertaking shall disclose whether it applies circular economy principles and, if so, how it applies these principles.\""
 },
 "VSME-CR-B01-09": {
  "worksheet": "VSME-B01.200",
  "id": "2882909c-753f-4609-81a9-023ea82fecbd",
  "severity": "warn",
  "condition": "GPSLocationOfSite IS NOT NULL",
  "condition_md5": "9dd85e5c75adb12e7b57b9fc2c36e3d3",
  "clause": "VSME B1 para 24(e)",
  "description": "Para 24(e): „… the geolocation of sites …“ Unbedingte Pflichtangabe; als Stammdatum beratend geführt.",
  "source_quote": null
 },
 "VSME-CR-B03-01": {
  "worksheet": "VSME-B03.000",
  "id": "2d2dd642-a65a-4375-a4cd-badd7206a1a1",
  "severity": "block",
  "condition": "TotalEnergyConsumption IS NOT NULL",
  "condition_md5": "f688bf66b0dc1b5f515e3196c4e5b706",
  "clause": "VSME B3 para 29",
  "description": "Para 29: „The undertaking shall disclose its total energy consumption in MWh …“ Die Gesamtangabe ist unbedingt (nur die tabellarische Aufschlüsselung ist „if it can obtain …“-bedingt).",
  "source_quote": "VSME B3, §29 (p.9): \"The undertaking shall disclose its total energy consumption in MWh, with a breakdown as per the table below, if it can obtain the necessary information to provide such a breakdown:\""
 },
 "VSME-CR-B03-02": {
  "worksheet": "VSME-B03.200",
  "id": "e5b16528-2691-4e2a-8d54-e3302e37f209",
  "severity": "block",
  "condition": "GrossScope1GreenhouseGasEmissions IS NOT NULL",
  "condition_md5": "9a9068145c05466e5d8991a5fcf832b0",
  "clause": "VSME B3 para 30(a)",
  "description": "Para 30(a): „… shall disclose its estimated gross greenhouse gas (GHG) emissions … including: (a) the Scope 1 GHG emissions in tCO2eq …“ Unbedingte Pflichtangabe.",
  "source_quote": "VSME B3, §30 (p.9): \"The undertaking shall disclose its estimated gross greenhouse gas (GHG) emissions in tons of CO2 equivalent (tCO2eq) considering the content of the GHG Protocol Corporate Standard (version 2004), including: (a) the Scope 1 GHG emissions in tCO2eq (from owned or controlled sources); and\""
 },
 "VSME-CR-B03-03": {
  "worksheet": "VSME-B03.200",
  "id": "0b5b0e09-d36e-4c2f-9cde-286d185ccc52",
  "severity": "block",
  "condition": "GrossLocationBasedScope2GreenhouseGasEmissions IS NOT NULL",
  "condition_md5": "1c50aaa155c611f468594727e0d55955",
  "clause": "VSME B3 para 30(b)",
  "description": "Para 30(b): „… (b) the location-based Scope 2 emissions in tCO2eq …“ Unbedingte Pflichtangabe (standortbezogene Scope-2-Emissionen).",
  "source_quote": "VSME B3, §30 (p.9): \"The undertaking shall disclose its estimated gross greenhouse gas (GHG) emissions in tons of CO2 equivalent (tCO2eq) considering the content of the GHG Protocol Corporate Standard (version 2004), including: ... (b) the location-based Scope 2 emissions in tCO2eq (i.e. emissions from the generation of purchased energy, such as electricity, heat, steam or cooling).\""
 },
 "VSME-CR-B03-04": {
  "worksheet": "VSME-B03.300",
  "id": "f85e8a04-b493-47b7-8a00-ac8b07ef0d02",
  "severity": "warn",
  "condition": "TotalLocationBasedGreenhouseGasEmissionsIntensityValue IS NOT NULL",
  "condition_md5": "a99f504e78dcd7e72351868e412e65c4",
  "clause": "VSME B3 para 31",
  "description": "Para 31: „… shall disclose its GHG intensity calculated by dividing gross GHG emissions … by turnover …“ Unbedingt, aber abgeleitet/berechnet — daher beratend, damit eine noch nicht materialisierte Berechnung keinen harten Gate auslöst.",
  "source_quote": null
 },
 "VSME-CR-B05-01": {
  "worksheet": "VSME-B05.000",
  "id": "6a64494a-8866-477d-b59f-4f55c7b644b1",
  "severity": "warn",
  "condition": "SiteLocatedInABiodiversitySensitiveArea IS NOT NULL",
  "condition_md5": "1c996cb49745a8fa2268c210d2c98554",
  "clause": "VSME B5 para 33",
  "description": "Para 33: „The undertaking shall disclose the number and area (in hectares) of sites that it owns, has leased, or manages in or near a biodiversity sensitive area.“ Unbedingt, aber site-bezogen (mehrere Standortzeilen) — daher beratend.",
  "source_quote": null
 },
 "VSME-CR-B06-01": {
  "worksheet": "VSME-B06.000",
  "id": "1117bbe8-6540-48a0-87c4-afc006980e9f",
  "severity": "block",
  "condition": "TotalAmountOfWaterWithdrawnFromAllSites IS NOT NULL",
  "condition_md5": "808317e6c218261f34432d7ef32e584a",
  "clause": "VSME B6 para 35",
  "description": "Para 35: „The undertaking shall disclose its total water withdrawal …“ Unbedingte Pflichtangabe (die Aufschlüsselung nach Wasserstress-Gebieten folgt als separate Pflichtangabe im selben Satz).",
  "source_quote": "VSME B6, §35 (p.10): \"The undertaking shall disclose its total water withdrawal, i.e. the amount of water drawn into the boundaries of the organisation (or facility); in addition, the undertaking shall separately present the amount of water withdrawn at sites located in areas of high water-stress.\""
 },
 "VSME-CR-B06-02": {
  "worksheet": "VSME-B06.000",
  "id": "4143d17a-cdfd-43d7-82f8-f3c2b5b27194",
  "severity": "warn",
  "condition": "AmountOfWaterWithdrawnAtSitesLocatedInAreasOfHighWaterStress IS NOT NULL",
  "condition_md5": "780076f6ee30c36bcdeaf2e292fafaf0",
  "clause": "VSME B6 para 35",
  "description": "Para 35 (2. Teil): „… in addition, the undertaking shall separately present the amount of water withdrawn at sites located in areas of high water-stress.“ Unbedingt, aber abhängig von einer externen Wasserstress-Einstufung — daher beratend.",
  "source_quote": null
 },
 "VSME-CR-B07-02": {
  "worksheet": "VSME-B07.200",
  "id": "3ea0aa29-70cc-4b51-ba5a-bf6fad174833",
  "severity": "warn",
  "condition": "TotalWasteGeneratedMass IS NOT NULL",
  "condition_md5": "884aa933c2e0bc5d00781984795e9e21",
  "clause": "VSME B7 para 38(a)",
  "description": "Para 38(a): „… the total annual generation of waste broken down by type (non-hazardous and hazardous) …“ Unbedingt, aber als Summe i. d. R. aus der Aufschlüsselung berechnet — daher beratend.",
  "source_quote": null
 },
 "VSME-CR-B08-01": {
  "worksheet": "VSME-B08.000",
  "id": "f8ec50f8-7fd2-4dde-b17b-300eca8b7c9d",
  "severity": "warn",
  "condition": "NumberOfPermanentContractEmployees IS NOT NULL AND NumberOfTemporaryContractEmployees IS NOT NULL",
  "condition_md5": "74d03ba662ecea3d093f229fa3037976",
  "clause": "VSME B8 para 39(a)",
  "description": "Para 39: „… shall disclose the number of employees … for the following metrics: (a) type of employment contract (temporary or permanent) …“ Unbedingt, aber als aufgeteilte Zählung (leer ≠ null) — daher beratend.",
  "source_quote": null
 },
 "VSME-CR-B08-02": {
  "worksheet": "VSME-B08.100",
  "id": "5bd41bb7-7cbd-4e2a-9477-1291c7b67f86",
  "severity": "warn",
  "condition": "NumberOfMaleEmployees IS NOT NULL AND NumberOfFemaleEmployees IS NOT NULL",
  "condition_md5": "3d17cc2619c5376067863deea6284b7a",
  "clause": "VSME B8 para 39(b)",
  "description": "Para 39(b): „… (b) gender …“ Unbedingt, aber als aufgeteilte Zählung (leer ≠ null) — daher beratend.",
  "source_quote": null
 },
 "VSME-CR-B08-03": {
  "worksheet": "VSME-B08.300",
  "id": "63c6798d-147b-4e39-91be-91e4b95e7a0d",
  "severity": "warn",
  "condition": "EmployeeTurnoverRate IS NOT NULL",
  "condition_md5": "6cda3b0c72c1cda22fadc2d42ec5a6a3",
  "clause": "VSME B8 para 40",
  "description": "Para 40: „If the undertaking employs 50 or more employees, it shall disclose the employee turnover rate …“ Bedingt (Schwellenwert 50). Der Auslöser (Beschäftigtenzahl) ist nicht im Gate-Grammar-Scope vergleichbar → beratend.",
  "source_quote": null
 },
 "VSME-CR-B09-01": {
  "worksheet": "VSME-B09.000",
  "id": "50f76d05-3550-4365-8436-fa6094c5b2a0",
  "severity": "block",
  "condition": "NumberOfRecordableWorkRelatedAccidentsInTheReportingPeriod IS NOT NULL",
  "condition_md5": "b31677e73de8514817795a5a9d2d5e22",
  "clause": "VSME B9 para 41(a)",
  "description": "Para 41: „The undertaking shall disclose the following information regarding its employees: (a) the number and rate of recordable work-related accidents …“ Unbedingte Pflichtangabe (auch der Wert 0 ist einzutragen).",
  "source_quote": "VSME B9, §41 (p.10): \"The undertaking shall disclose the following information regarding its employees: (a) the number and rate of recordable work-related accidents; and\""
 },
 "VSME-CR-B09-02": {
  "worksheet": "VSME-B09.000",
  "id": "7ac7b8cc-de88-4be5-aca0-bc06b0e324cc",
  "severity": "block",
  "condition": "NumberOfFatalitiesAsAResultOfWorkRelatedInjuriesAndWorkRelatedIllHealth IS NOT NULL",
  "condition_md5": "a2d570389811c5be02229a6fd8b20d93",
  "clause": "VSME B9 para 41(b)",
  "description": "Para 41(b): „… the number of fatalities as a result of work-related injuries and work-related ill health.“ Unbedingte Pflichtangabe (auch der Wert 0 ist einzutragen).",
  "source_quote": "VSME B9, §41 (p.10): \"The undertaking shall disclose the following information regarding its employees: ... (b) the number of fatalities as a result of work-related injuries and work-related ill health.\""
 },
 "VSME-CR-B09-03": {
  "worksheet": "VSME-B09.000",
  "id": "9b57d242-19bf-40df-9a09-3142aa5b4eda",
  "severity": "warn",
  "condition": "RateOfRecordableWorkRelatedAccidentsInTheReportingPeriod IS NOT NULL",
  "condition_md5": "607e6612ef41e022d9e9a0bda9930b06",
  "clause": "VSME B9 para 41(a)",
  "description": "Para 41(a): „… the number and rate of recordable work-related accidents …“ Unbedingt, aber als abgeleitete Rate — daher beratend (Anzahl wird hart geprüft).",
  "source_quote": null
 },
 "VSME-CR-B10-01": {
  "worksheet": "VSME-B10.000",
  "id": "1a1cf47a-d6ce-471d-9bc7-148f596697c9",
  "severity": "warn",
  "condition": "EmployeesReceivePayEqualOrAboveMinimumWageDeterminedByNationalLawOrCollectiveAgreement IS NOT NULL",
  "condition_md5": "89233876040aaf475bcf38f2822d4820",
  "clause": "VSME B10 para 42(a)",
  "description": "Para 42(a): „… whether the employees receive pay that is equal or above applicable minimum wage …“ Unbedingte Ja/Nein-Angabe — beratend gehalten (konservativ).",
  "source_quote": null
 },
 "VSME-CR-B10-02": {
  "worksheet": "VSME-B10.000",
  "id": "adcd0077-1e2b-4e35-b973-d4c7db96d606",
  "severity": "warn",
  "condition": "PercentageOfEmployeesCoveredByCollectiveBargainingAgreements IS NOT NULL",
  "condition_md5": "fb0561d3f6a3fbccfd40998a5aa49819",
  "clause": "VSME B10 para 42(c)",
  "description": "Para 42(c): „… the percentage of employees covered by collective bargaining agreements …“ Unbedingt — beratend gehalten (konservativ).",
  "source_quote": null
 },
 "VSME-CR-B11-01": {
  "worksheet": "VSME-B11.000",
  "id": "47823c78-f4c8-466c-8542-02eb1d576e5e",
  "severity": "warn",
  "condition": "TotalNumberOfConvictionsForTheViolationOfAntiCorruptionAndAntiBriberyLaws IS NOT NULL",
  "condition_md5": "e053c6dc1e793a2dbf7eb2e14b92dd03",
  "clause": "VSME B11 para 43",
  "description": "Para 43: „In case of convictions and fines in the reporting period, the undertaking shall disclose the number of convictions, and the total amount of fines …“ Ausdrücklich bedingt („In case of …“) → beratend, niemals hart blockierend.",
  "source_quote": null
 },
 "VSME-CR-C01-01": {
  "worksheet": "VSME-C01.000",
  "id": "54b20079-571e-4de7-b006-eea588fc8787",
  "severity": "warn",
  "condition": "DescriptionOfSignificantGroupsOfProductsAndOrServicesOffered IS NOT NULL",
  "condition_md5": "c6229f3028a112adb0c13ea470ff7875",
  "clause": "VSME C1 para 47(a)",
  "description": "Para 47: „The undertaking shall disclose the key elements of its business model and strategy …“ Comprehensive-Modul → para 45: bei Auslassung „assumed to not be applicable“ → beratend.",
  "source_quote": null
 },
 "VSME-CR-C06-01": {
  "worksheet": "VSME-C06.000",
  "id": "80c7ca55-ffbc-475a-8a67-94d4a6dfa435",
  "severity": "warn",
  "condition": "UndertakingHasACodeOfConductOrHumanRightsPolicyForItsOwnWorkforce IS NOT NULL",
  "condition_md5": "2e9e9c1d4584a76fdd2a8a57fe06c9db",
  "clause": "VSME C6 para 61(a)",
  "description": "Para 61(a): „Does the undertaking have a code of conduct or human rights policy for its own workforce? (YES/NO)“ Comprehensive-Modul (para 45) → beratend.",
  "source_quote": null
 },
 "VSME-CR-C08-01": {
  "worksheet": "VSME-C08.100",
  "id": "18f70e2e-9d80-42db-ad21-e57b193b36fb",
  "severity": "warn",
  "condition": "UndertakingsAreExcludedFromAnyEuReferenceBenchmarksThatAreAlignedWithTheParisAgreement IS NOT NULL",
  "condition_md5": "a281019c385ab46ee8cfc49ae5a2bb02",
  "clause": "VSME C8 para 64",
  "description": "Para 64: „The undertaking shall disclose whether it is excluded from any EU reference benchmarks that are aligned with the Paris Agreement …“ Comprehensive-Modul (para 45) → beratend.",
  "source_quote": null
 },
 "VSME-CR-C09-01": {
  "worksheet": "VSME-C09.000",
  "id": "fafa0b33-bf99-477f-af6c-54f6b062cfc7",
  "severity": "warn",
  "condition": "GenderDiversityRatioInGovernanceBody IS NOT NULL",
  "condition_md5": "6d28c9b62cb2b18e92783faccfe6e120",
  "clause": "VSME C9 para 65",
  "description": "Para 65: „If the undertaking has a governance body in place, the undertaking shall disclose the related gender diversity ratio.“ Bedingt + Comprehensive-Modul → beratend.",
  "source_quote": null
 }
};
/** prod field label / unit / data_type / is_required / id per "<worksheet> <symbol>" (EV). */
export const PROD_FIELDS: Record<string, { label_de: string | null; unit: string | null; data_type: string; is_required: boolean; id: string }> = {"VSME-B01.000 Assets":{"label_de":"Assets","unit":"EUR","data_type":"number","is_required":true,"id":"876a8444-0bd1-47db-bd81-945811e36a01"},"VSME-B01.000 BasisForPreparation":{"label_de":"Basis for preparation (Basic Module Only or Basic & Comprehensive Module)","unit":null,"data_type":"enum","is_required":true,"id":"9c614b70-a984-431a-b380-8d95915ef179"},"VSME-B01.000 BasisForReporting":{"label_de":"Basis for reporting (consolidated or individual basis)","unit":null,"data_type":"enum","is_required":true,"id":"89f8adee-c87a-487e-9a56-3d519dc4bb69"},"VSME-B01.000 CountryOfPrimaryOperationsAndLocationOfSignificantAssets":{"label_de":"Country of primary operations and location of significant assets","unit":null,"data_type":"enum","is_required":true,"id":"d202ccf0-4fb9-41a5-a14b-8882bbb68dcb"},"VSME-B01.000 DescriptionOfSustainabilityRelatedCertificationsOrLabels":{"label_de":"DescriptionOfSustainabilityRelatedCertificationsOrLabels","unit":null,"data_type":"text","is_required":false,"id":"c0ba21b1-1de8-4328-a3d0-ddde927da40b"},"VSME-B01.000 EmployeeCountingMethodology":{"label_de":"Employee counting methodology","unit":null,"data_type":"enum","is_required":false,"id":"33dc0a70-8d72-4d9a-9c76-7efbb5935eb8"},"VSME-B01.000 LinkToPreviousReportContainingDisclosuresThatRemainUnchanged":{"label_de":"Link to previous report containing disclosures that remain unchanged","unit":null,"data_type":"text","is_required":false,"id":"f1a48fa0-7ab0-4454-8937-5cf298ca800a"},"VSME-B01.000 ListOfDisclosuresForWhichNoChangesAreReportedComparedToThePreviousPeriodReporting":{"label_de":"List of disclosures for which no changes are reported compared to the previous period reporting","unit":null,"data_type":"enum","is_required":false,"id":"1289ed17-bbb4-4a9f-824b-c9c7f617d8ca"},"VSME-B01.000 ListOfOmittedDisclosuresDeemedToBeClassifiedOrSensitiveInformation":{"label_de":"List of omitted disclosures deemed to be classified or sensitive information","unit":null,"data_type":"enum","is_required":false,"id":"2153b964-d97e-4825-8ffe-c6acf2f2040c"},"VSME-B01.000 NaceSectorClassificationCodes":{"label_de":"NACE sector classification codes","unit":null,"data_type":"enum","is_required":true,"id":"343b9493-fee2-463a-9a11-76f84a2042b0"},"VSME-B01.000 NumberOfEmployees":{"label_de":"Number of employees","unit":null,"data_type":"number","is_required":true,"id":"09154fe0-9126-43ee-adcd-3450caa6d920"},"VSME-B01.000 OtherUndertakingsLegalForm":{"label_de":"Other undertaking's legal form","unit":null,"data_type":"text","is_required":false,"id":"d0945346-2927-4349-9833-93b2827b0435"},"VSME-B01.000 ReportContainsDisclosuresFromThePreviousReportingPeriodThatRemainUnchanged":{"label_de":"Report contains disclosures from the previous reporting period that remain unchanged","unit":null,"data_type":"boolean","is_required":false,"id":"2a72d8f9-3ddf-42c0-90fc-d99abb46e19a"},"VSME-B01.000 Turnover":{"label_de":"Turnover","unit":"EUR","data_type":"number","is_required":true,"id":"a2ca6745-d403-4ac4-9cbe-bbd6d3242ac4"},"VSME-B01.000 TypeOfNumberOfEmployees":{"label_de":"Type of number of employees","unit":null,"data_type":"enum","is_required":false,"id":"082730e5-946b-4ccf-8c2f-fe3f212c58ba"},"VSME-B01.000 UndertakingsLegalForm":{"label_de":"Undertakings legal form","unit":null,"data_type":"enum","is_required":true,"id":"3ad9db85-3aa5-4258-b1d9-9f03f9f25aaf"},"VSME-B01.100 NameOfTheSubsidiary":{"label_de":"Name of the subsidiary","unit":null,"data_type":"text","is_required":false,"id":"5191082b-5804-477f-b6e2-6717613ac95d"},"VSME-B01.100 RegisteredAddressOfTheSubsidiary":{"label_de":"Registered address of the subsidiary","unit":null,"data_type":"text","is_required":false,"id":"e4fb077f-5e58-4c6a-b92c-404d887d4bab"},"VSME-B01.200 AddressOfSite":{"label_de":"Address of site","unit":null,"data_type":"text","is_required":false,"id":"650e911f-9856-417f-9364-9372fb505ec3"},"VSME-B01.200 CityOfSite":{"label_de":"CityOfSite","unit":null,"data_type":"text","is_required":false,"id":"31b609d4-dc7b-4dc9-9eba-5e9efadf7397"},"VSME-B01.200 CountryOfSite":{"label_de":"Country of site","unit":null,"data_type":"enum","is_required":false,"id":"d956297c-3071-49d5-a6a5-375f3f3b5503"},"VSME-B01.200 GPSLocationOfSite":{"label_de":"GPS Location of site","unit":null,"data_type":"text","is_required":true,"id":"55fba4e5-6d71-40ce-94ff-9366ebb0db66"},"VSME-B01.200 PostalCodeOfSite":{"label_de":"PostalCodeOfSite","unit":null,"data_type":"text","is_required":false,"id":"ed0611d6-d49a-49ab-96de-016277c71a7e"},"VSME-B02.000 PracticePolicyAndOrFutureInitiativeIsPubliclyAvailable":{"label_de":"PracticePolicyAndOrFutureInitiativeIsPubliclyAvailable","unit":null,"data_type":"boolean","is_required":false,"id":"4f96f175-1c21-4c92-8742-b42f988965bb"},"VSME-B02.000 SustainabilityIssueAddressedByPracticePolicyAndOrFutureInitiative":{"label_de":"SustainabilityIssueAddressedByPracticePolicyAndOrFutureInitiative","unit":null,"data_type":"enum","is_required":false,"id":"30440307-ad60-4bc3-935d-d7a1afa53615"},"VSME-B02.000 UndertakingHasSetATargetWhichIsRelatedToAPolicy":{"label_de":"UndertakingHasSetATargetWhichIsRelatedToAPolicy","unit":null,"data_type":"boolean","is_required":false,"id":"9bc6625b-871c-4201-a5b1-e5c987fd8b8d"},"VSME-B02.100 DescriptionOfLimitsToTheDistributionOfProfitsConnectedToTheMutualisticNatureOrToTheNatureOfTheActivitiesConsistingInServicesOfGeneralEconomicInterestSGEI":{"label_de":"DescriptionOfLimitsToTheDistributionOfProfitsConnectedToTheMutualisticNatureOrToTheNatureOfTheActivitiesConsistingInServicesOfGeneralEconomicInterestSGEI","unit":null,"data_type":"text","is_required":false,"id":"d04a252c-896e-432e-a3f4-63e552007568"},"VSME-B02.100 DescriptionOfTheEffectiveParticipationOfWorkersUsersOrOtherInterestedPartiesOrCommunitiesInGovernance":{"label_de":"DescriptionOfTheEffectiveParticipationOfWorkersUsersOrOtherInterestedPartiesOrCommunitiesInGovernance","unit":null,"data_type":"text","is_required":false,"id":"d6be6b66-a09c-4794-a0a9-969844598f76"},"VSME-B02.100 FinancialInvestmentInTheCapitalOrAssetsOfSocialEconomyEntities":{"label_de":"FinancialInvestmentInTheCapitalOrAssetsOfSocialEconomyEntities","unit":"EUR","data_type":"number","is_required":false,"id":"3cfafc12-4252-4a17-a433-a4998f5d4216"},"VSME-B03.000 TotalEnergyConsumption":{"label_de":"Total energy consumption","unit":"MWh","data_type":"number","is_required":true,"id":"3d877b74-413f-47c4-b039-317b34ea84e0"},"VSME-B03.100 EnergyConsumptionFromElectricity":{"label_de":"EnergyConsumptionFromElectricity","unit":"MWh","data_type":"number","is_required":false,"id":"587bb849-f9d9-4b96-8e95-a9e12d7a0f0c"},"VSME-B03.100 EnergyConsumptionFromFuels":{"label_de":"EnergyConsumptionFromFuels","unit":"MWh","data_type":"number","is_required":false,"id":"a29e68a2-d3a5-470b-898a-bb172e53a76b"},"VSME-B03.100 EnergyConsumptionFromSelfGeneratedElectricity":{"label_de":"EnergyConsumptionFromSelfGeneratedElectricity","unit":"MWh","data_type":"number","is_required":false,"id":"dfa2a147-11fc-46d4-abdd-87ae02894603"},"VSME-B03.200 GrossLocationBasedScope2GreenhouseGasEmissions":{"label_de":"GrossLocationBasedScope2GreenhouseGasEmissions","unit":"tCO2eq","data_type":"number","is_required":true,"id":"9b4b2378-3a61-42cd-9909-02badf2699f2"},"VSME-B03.200 GrossMarketBasedScope2GreenhouseGasEmissions":{"label_de":"GrossMarketBasedScope2GreenhouseGasEmissions","unit":"tCO2eq","data_type":"number","is_required":false,"id":"b305bf62-ae65-4218-baed-b7c59cd3616f"},"VSME-B03.200 GrossScope1GreenhouseGasEmissions":{"label_de":"GrossScope1GreenhouseGasEmissions","unit":"tCO2eq","data_type":"number","is_required":true,"id":"c1846de2-80e2-452b-b302-cb5c50350220"},"VSME-B03.200 GrossScope3GreenhouseGasEmissions":{"label_de":"GrossScope3GreenhouseGasEmissions","unit":"tCO2eq","data_type":"number","is_required":false,"id":"282d5e97-22d1-49e3-b4fc-d23178b0fe30"},"VSME-B03.200 TotalGrossLocationBasedGHGEmissions":{"label_de":"Total (gross) location-based GHG emissions","unit":"tCO2eq","data_type":"number","is_required":false,"id":"68c11e5b-4dd8-4462-9e5c-2a7ff77849cd"},"VSME-B03.200 TotalGrossLocationBasedScope1AndScope2GHGEmissions":{"label_de":"TotalGrossLocationBasedScope1AndScope2GHGEmissions","unit":"tCO2eq","data_type":"number","is_required":false,"id":"90b9ad0c-1994-4e2c-b377-0d9fe73f116a"},"VSME-B03.200 TotalGrossMarketBasedGHGEmissions":{"label_de":"Total (gross) market-based GHG emissions","unit":"tCO2eq","data_type":"number","is_required":false,"id":"8d93a684-116f-46b2-af0e-bbc4af92c61a"},"VSME-B03.200 TotalGrossMarketBasedScope1AndScope2GHGEmissions":{"label_de":"TotalGrossMarketBasedScope1AndScope2GHGEmissions","unit":"tCO2eq","data_type":"number","is_required":false,"id":"99d3644c-d66e-408b-961f-002fccee6c37"},"VSME-B03.300 Scope1AndScope2GreenhouseGasEmissionsIntensityValueLocationBased":{"label_de":"Scope1AndScope2GreenhouseGasEmissionsIntensityValueLocationBased","unit":"tCO2eq/EUR","data_type":"number","is_required":false,"id":"60be76d9-8d29-44b5-b279-5374aec77b77"},"VSME-B03.300 Scope1AndScope2GreenhouseGasEmissionsIntensityValueMarketBased":{"label_de":"Scope1AndScope2GreenhouseGasEmissionsIntensityValueMarketBased","unit":"tCO2eq/EUR","data_type":"number","is_required":false,"id":"184c68a2-5a6b-4d0e-8c30-039f4e9f7d4b"},"VSME-B03.300 TotalLocationBasedGreenhouseGasEmissionsIntensityValue":{"label_de":"TotalLocationBasedGreenhouseGasEmissionsIntensityValue","unit":"tCO2eq/EUR","data_type":"number","is_required":true,"id":"2c312a11-514c-4ca8-a234-b0ef432aeee0"},"VSME-B03.300 TotalMarketBasedGreenhouseGasEmissionsIntensityValue":{"label_de":"TotalMarketBasedGreenhouseGasEmissionsIntensityValue","unit":"tCO2eq/EUR","data_type":"number","is_required":false,"id":"1880eb58-6444-4305-91f6-ed1a209d0686"},"VSME-B04.000 PubliclyAvailableDisclosure":{"label_de":"Publicly available disclosure","unit":null,"data_type":"boolean","is_required":false,"id":"df97f6c7-619d-43cb-a0ff-1b9c49342523"},"VSME-B04.000 URLOrLinkToThePubliclyAvailableDisclosure":{"label_de":"URLOrLinkToThePubliclyAvailableDisclosure","unit":null,"data_type":"text","is_required":false,"id":"8f6e3d60-fe5e-40d9-a878-69aab4bcea6a"},"VSME-B04.100 pollutant_register":{"label_de":"Schadstoffregister (je Schadstoff und Medium, E-PRTR)","unit":null,"data_type":"json","is_required":false,"id":"b0410000-0000-4000-8000-000000000001"},"VSME-B04.100 AmountOfEmissionToAir":{"label_de":"Amount of emission to air","unit":"t","data_type":"number","is_required":false,"id":"bddda888-2968-4f92-9054-e5bcdb0da3cb"},"VSME-B04.100 AmountOfEmissionToSoil":{"label_de":"Amount of emission to soil","unit":"t","data_type":"number","is_required":false,"id":"56209ae0-30a3-42ab-ad9e-cc7c9dd5492f"},"VSME-B04.100 AmountOfEmissionToWater":{"label_de":"Amount of emission to water","unit":"t","data_type":"number","is_required":false,"id":"4679cad1-a29f-456d-bec3-75360112f01b"},"VSME-B05.000 AreaOfSiteInBiodiversitySensitiveArea":{"label_de":"Area of site in biodiversity sensitive area","unit":"ha","data_type":"number","is_required":true,"id":"bb97b58f-2ee3-4fb2-8616-e66c322373a2"},"VSME-B05.000 SiteLocatedInABiodiversitySensitiveArea":{"label_de":"Site located in a biodiversity sensitive area","unit":null,"data_type":"boolean","is_required":true,"id":"22fed9b3-026d-40b6-9853-ac2a8115e65e"},"VSME-B05.000 SiteLocatedNearABiodiversitySensitiveArea":{"label_de":"Site located near a biodiversity sensitive area","unit":null,"data_type":"boolean","is_required":true,"id":"67ce8110-c6b9-486a-bd00-08826a14641c"},"VSME-B05.100 TotalNatureOrientedAreaOffSite":{"label_de":"Total nature oriented area off-site","unit":"ha","data_type":"number","is_required":false,"id":"665fd1f2-5dca-4b57-bbb6-343561c30d88"},"VSME-B05.100 TotalNatureOrientedAreaOnSite":{"label_de":"Total nature oriented area on-site","unit":"ha","data_type":"number","is_required":false,"id":"bab4fc27-64a3-4042-85cd-e47a78c900ab"},"VSME-B05.100 TotalSealedArea":{"label_de":"Total sealed area","unit":"ha","data_type":"number","is_required":false,"id":"a4c53a84-74f7-4e43-9934-e697229171e7"},"VSME-B05.100 TotalUseOfLand":{"label_de":"Total use of land","unit":"ha","data_type":"number","is_required":false,"id":"d72374e6-305a-490f-aced-145164edd0a9"},"VSME-B06.000 AmountOfWaterWithdrawnAtSitesLocatedInAreasOfHighWaterStress":{"label_de":"AmountOfWaterWithdrawnAtSitesLocatedInAreasOfHighWaterStress","unit":"m³","data_type":"number","is_required":true,"id":"b8f74a0b-478a-41bc-8817-15cb764d37a1"},"VSME-B06.000 TotalAmountOfWaterWithdrawnFromAllSites":{"label_de":"TotalAmountOfWaterWithdrawnFromAllSites","unit":"m³","data_type":"number","is_required":true,"id":"4a17600b-31ca-4dee-a44a-0a0d96506eab"},"VSME-B06.100 TotalWaterConsumption":{"label_de":"TotalWaterConsumption","unit":"m³","data_type":"number","is_required":false,"id":"6687eccd-3912-4549-ad4e-a0ef8de9a669"},"VSME-B06.100 WaterDischargeFromUndertakingProductionProcesses":{"label_de":"WaterDischargeFromUndertakingProductionProcesses","unit":"m³","data_type":"number","is_required":false,"id":"bb2b772b-bd4d-430f-af0d-91d17cb84eb7"},"VSME-B07.000 DescriptionOfHowCircularEconomyPrinciplesAreApplied":{"label_de":"Description of how circular economy principles are applied","unit":null,"data_type":"text","is_required":false,"id":"275d8bfa-b540-40e3-a3f8-14bcd6fbe228"},"VSME-B07.000 UndertakingAppliesCircularEconomyPrinciples":{"label_de":"UndertakingAppliesCircularEconomyPrinciples","unit":null,"data_type":"boolean","is_required":true,"id":"c2afa031-8e31-4e94-bb18-be560426dd9c"},"VSME-B07.100 TotalWasteRecycledReusedAndDirectedToDisposalMass":{"label_de":"Total waste recycled, reused and directed to disposal (mass)","unit":"kg","data_type":"number","is_required":false,"id":"6cf0d3ad-95d3-4b7e-9cee-66ddb05a2760"},"VSME-B07.100 TotalWasteRecycledReusedAndDirectedToDisposalVolume":{"label_de":"Total waste recycled, reused and directed to disposal (volume)","unit":"m³","data_type":"number","is_required":false,"id":"508ff12f-321e-42ef-b4c0-717acf58ed40"},"VSME-B07.100 WasteDirectedToDisposalMass":{"label_de":"Waste directed to disposal (mass)","unit":"kg","data_type":"number","is_required":false,"id":"ce856e51-8972-472e-9e9f-2de8aca7d3c6"},"VSME-B07.100 WasteDirectedToDisposalVolume":{"label_de":"Waste directed to disposal (volume)","unit":"m³","data_type":"number","is_required":false,"id":"1418fde7-1fd1-4b18-9e1a-066354704403"},"VSME-B07.100 WasteDivertedToRecycleOrReuseMass":{"label_de":"Waste diverted to recycle or reuse (mass)","unit":"kg","data_type":"number","is_required":true,"id":"be47be4f-6767-4241-97ee-df1127c7c1f1"},"VSME-B07.100 WasteDivertedToRecycleOrReuseVolume":{"label_de":"Waste diverted to recycle or reuse (volume)","unit":"m³","data_type":"number","is_required":false,"id":"b943c0be-15f0-48c8-aaa0-30bd885eeb0f"},"VSME-B07.200 TotalHazardousWasteGeneratedMass":{"label_de":"Total Hazardous waste generated (mass)","unit":"t","data_type":"number","is_required":true,"id":"737a57ea-8fda-455e-90bd-311733184b79"},"VSME-B07.200 TotalHazardousWasteGeneratedVolume":{"label_de":"Total Hazardous waste generated (volume)","unit":"m³","data_type":"number","is_required":false,"id":"5b54da59-e1ed-4767-82c3-5acbc2af6550"},"VSME-B07.200 TotalNonHazardousWasteGeneratedMass":{"label_de":"Total Non-Hazardous waste generated (mass)","unit":"t","data_type":"number","is_required":true,"id":"59a28844-a931-4256-b50f-592bb0da43fb"},"VSME-B07.200 TotalNonHazardousWasteGeneratedVolume":{"label_de":"Total Non-Hazardous waste generated (volume)","unit":"m³","data_type":"number","is_required":false,"id":"50bb2e35-9feb-4a70-b3c9-16a7a479931e"},"VSME-B07.200 TotalWasteGeneratedMass":{"label_de":"Total waste generated (mass)","unit":"t","data_type":"number","is_required":true,"id":"5d280dfb-dcb3-4e6a-918d-9afc3032df25"},"VSME-B07.200 TotalWasteGeneratedVolume":{"label_de":"Total waste generated (volume)","unit":"m³","data_type":"number","is_required":false,"id":"42760b06-c561-4962-86e6-d918304c86a5"},"VSME-B07.300 NameOfMaterialUsed":{"label_de":"Name of the material used","unit":null,"data_type":"text","is_required":false,"id":"fc00346f-794e-4fed-9cc7-55356fe3c98d"},"VSME-B07.300 VolumeOfMaterialUsed":{"label_de":"VolumeOfMaterialUsed","unit":"m³","data_type":"number","is_required":false,"id":"07c6dd4b-5476-4fe4-9ead-bb53dac20ba0"},"VSME-B07.300 WeightOfMaterialUsed":{"label_de":"Weight of material used","unit":"t","data_type":"number","is_required":false,"id":"18d08422-0143-4035-92e0-22f5bf9f9872"},"VSME-B07.400 TotalMassOfMaterialUsed":{"label_de":"Total weight of material used","unit":"t","data_type":"number","is_required":false,"id":"4fa33d60-7b85-4b02-b7ac-75ac82c42aa3"},"VSME-B07.400 TotalVolumeOfMaterialUsed":{"label_de":"Total volume of material used","unit":"m³","data_type":"number","is_required":false,"id":"006aa09f-78e8-41bb-b0fb-cf6bec5dc90b"},"VSME-B08.000 NumberOfPermanentContractEmployees":{"label_de":"Number of permanent contact employees","unit":null,"data_type":"number","is_required":true,"id":"b1582de4-04a1-4640-a6a7-54644d3d8e06"},"VSME-B08.000 NumberOfTemporaryContractEmployees":{"label_de":"NumberOfTemporaryContractEmployees","unit":null,"data_type":"number","is_required":true,"id":"1ecc5a35-d3a0-43fd-94bc-680ee1c81970"},"VSME-B08.100 NumberOfFemaleEmployees":{"label_de":"Number of female employees","unit":null,"data_type":"number","is_required":true,"id":"d250e4a0-2dcb-434c-b9c8-c44e5120689b"},"VSME-B08.100 NumberOfMaleEmployees":{"label_de":"Number of male employees","unit":null,"data_type":"number","is_required":true,"id":"66cc819f-f45f-40f7-8f3b-d11f5bbb5c44"},"VSME-B08.100 NumberOfNonReportedGenderEmployees":{"label_de":"Number of non-reported gender employees","unit":null,"data_type":"number","is_required":false,"id":"48300a24-9d72-41c3-9c51-5269cd0666e1"},"VSME-B08.100 NumberOfOtherGenderEmployees":{"label_de":"Number of other gender employees","unit":null,"data_type":"number","is_required":false,"id":"37eccadb-c988-442c-8ceb-9c676d69378a"},"VSME-B08.200 NumberOfEmployeesForCountryOfEmploymentContract":{"label_de":"Number of employees for country of employment contract [line items]","unit":null,"data_type":"number","is_required":false,"id":"9bd75cca-73af-4b17-97da-84a484b38e26"},"VSME-B08.300 EmployeeTurnoverRate":{"label_de":"Employee turnover rate","unit":"%","data_type":"number","is_required":false,"id":"55791770-a579-4099-8178-77a5a515cc21"},"VSME-B09.000 NumberOfFatalitiesAsAResultOfWorkRelatedInjuriesAndWorkRelatedIllHealth":{"label_de":"Number of fatalities as a result of work-related injuries and work-related ill health","unit":null,"data_type":"number","is_required":true,"id":"e11aa66f-d24e-43d1-8685-bc30eff24227"},"VSME-B09.000 NumberOfRecordableWorkRelatedAccidentsInTheReportingPeriod":{"label_de":"NumberOfRecordableWorkRelatedAccidentsInTheReportingPeriod","unit":null,"data_type":"number","is_required":true,"id":"47ddfce0-a0ff-4767-8626-0c6896b8da7d"},"VSME-B09.000 RateOfRecordableWorkRelatedAccidentsInTheReportingPeriod":{"label_de":"RateOfRecordableWorkRelatedAccidentsInTheReportingPeriod","unit":null,"data_type":"number","is_required":true,"id":"0c07ab7f-50b1-42f8-b0e1-cbac657fc1b9"},"VSME-B10.000 AverageNumberOfAnnualTrainingHoursPerFemaleEmployee":{"label_de":"AverageNumberOfAnnualTrainingHoursPerFemaleEmployee","unit":"hours","data_type":"number","is_required":true,"id":"6b85cf8e-b46a-492b-bd89-22b115853efc"},"VSME-B10.000 AverageNumberOfAnnualTrainingHoursPerMaleEmployee":{"label_de":"AverageNumberOfAnnualTrainingHoursPerMaleEmployee","unit":"hours","data_type":"number","is_required":true,"id":"660faa3e-4993-4955-b79e-311f4471c9e6"},"VSME-B10.000 AverageNumberOfAnnualTrainingHoursPerNonReportedGenderEmployee":{"label_de":"Average number of annual training hours per non-reported gender employee","unit":"hours","data_type":"number","is_required":false,"id":"a5ea0c54-ebcb-4e33-8fd6-ab644467071d"},"VSME-B10.000 AverageNumberOfAnnualTrainingHoursPerOtherGenderEmployee":{"label_de":"AverageNumberOfAnnualTrainingHoursPerOtherGenderEmployee","unit":"hours","data_type":"number","is_required":false,"id":"0eafe37e-a7bb-4482-bfca-a6d9070862fa"},"VSME-B10.000 EmployeesReceivePayEqualOrAboveMinimumWageDeterminedByNationalLawOrCollectiveAgreement":{"label_de":"Employees receive pay equal or above minimum wage determined by national law or collective bargaining agreement","unit":null,"data_type":"boolean","is_required":true,"id":"0850e80f-8bc3-45c9-b634-6bc7b68b28cf"},"VSME-B10.000 PercentageGapInPayBetweenFemaleAndMaleEmployees":{"label_de":"PercentageGapInPayBetweenFemaleAndMaleEmployees","unit":"%","data_type":"number","is_required":false,"id":"42ac71e3-2b48-4467-b847-122d051d17a2"},"VSME-B10.000 PercentageOfEmployeesCoveredByCollectiveBargainingAgreements":{"label_de":"Percentage of employees covered by collective bargaining agreements","unit":"%","data_type":"number","is_required":true,"id":"f9538745-b03a-41cd-84d1-384194c87f4f"},"VSME-B11.000 TotalAmountOfFinesForTheViolationOfAnticorruptionAndAntibriberyLaws":{"label_de":"Total amount of fines for the violation of anticorruption and antibribery laws","unit":"EUR","data_type":"number","is_required":false,"id":"eb77f09d-3748-4acf-92e6-a9516318f3bc"},"VSME-B11.000 TotalNumberOfConvictionsForTheViolationOfAntiCorruptionAndAntiBriberyLaws":{"label_de":"TotalNumberOfConvictionsForTheViolationOfAntiCorruptionAndAntiBriberyLaws","unit":null,"data_type":"number","is_required":false,"id":"f079fa0a-34db-4a1a-8742-ceea89dd34de"},"VSME-C01.000 DescriptionOfKeyElementsOfStrategyThatRelatesToOrAffectsSustainabilityIssues":{"label_de":"DescriptionOfKeyElementsOfStrategyThatRelatesToOrAffectsSustainabilityIssues","unit":null,"data_type":"text","is_required":false,"id":"ccf4d766-1e8a-4a05-b462-716cb64c8f7e"},"VSME-C01.000 DescriptionOfMainBusinessRelationships":{"label_de":"Description of main business relationships (e.g. key suppliers, customers distribution channels)","unit":null,"data_type":"text","is_required":false,"id":"602cf05e-19f5-4a69-9898-11e924b55420"},"VSME-C01.000 DescriptionOfSignificantGroupsOfProductsAndOrServicesOffered":{"label_de":"Description of significant groups of products and/or services offered","unit":null,"data_type":"text","is_required":false,"id":"996523df-342c-46ec-b94c-c6445bb61a8b"},"VSME-C01.000 DescriptionOfSignificantMarketsTheUndertakingOperatesIn":{"label_de":"Description of significant market(s) the undertaking operates in","unit":null,"data_type":"text","is_required":false,"id":"295db2ca-ca89-4cec-b03d-3f26830d4493"},"VSME-C02.000 DescriptionOfATargetRelatedToAPolicy":{"label_de":"DescriptionOfATargetRelatedToAPolicy","unit":null,"data_type":"text","is_required":false,"id":"c796f85c-fae1-4652-8e24-89b4493fccb8"},"VSME-C02.000 DescriptionOfPracticesPoliciesAndOrFutureInitiatives":{"label_de":"DescriptionOfPracticesPoliciesAndOrFutureInitiatives","unit":null,"data_type":"text","is_required":false,"id":"8e075839-92f4-49e4-9a4f-295d6f15798f"},"VSME-C02.000 MostSeniorLevelAccountableForImplementationOfPolicies":{"label_de":"MostSeniorLevelAccountableForImplementationOfPolicies","unit":null,"data_type":"text","is_required":false,"id":"7fb7faad-7f8e-4141-b067-277abf03bcca"},"VSME-C03.000 GreenhouseGasEmissionReductionTargetBaseYear":{"label_de":"GreenhouseGasEmissionReductionTargetBaseYear","unit":null,"data_type":"text","is_required":false,"id":"a4d44129-3134-4ac0-93d5-0a05f0ae462b"},"VSME-C03.000 GreenhouseGasEmissionReductionTargetYear":{"label_de":"GreenhouseGasEmissionReductionTargetYear","unit":null,"data_type":"text","is_required":false,"id":"3d261522-6c2f-4715-984a-49a1c8808e6a"},"VSME-C03.200 DisclosureOfListOfMainActionsTheEntitySeeksInOrderToAchieveItsTargets":{"label_de":"DisclosureOfListOfMainActionsTheEntitySeeksInOrderToAchieveItsTargets","unit":null,"data_type":"text","is_required":false,"id":"0a683352-e219-4d5e-9d50-237b7c6133ba"},"VSME-C03.300 DateOfAdoptionOfTransitionPlanForUndertakingNotHavingAdoptedTransitionPlanYet":{"label_de":"DateOfAdoptionOfTransitionPlanForUndertakingNotHavingAdoptedTransitionPlanYet","unit":null,"data_type":"date","is_required":false,"id":"b0741cb5-526e-4f52-87bd-55277a618c96"},"VSME-C03.300 DescriptionOfATransitionPlanForClimateChangeMitigationIncludingAnExplanationOfHowItIsContributingToReduceGhgEmissions":{"label_de":"Description of a transition plan for climate change mitigation, including an explanation of how it is contributing to reduce GHG emissions","unit":null,"data_type":"text","is_required":false,"id":"c0634801-452c-4ad8-9a2a-aa0993665261"},"VSME-C04.000 DescriptionOfClimateRelatedHazardsAndClimateRelatedTransitionEvents":{"label_de":"DescriptionOfClimateRelatedHazardsAndClimateRelatedTransitionEvents","unit":null,"data_type":"text","is_required":false,"id":"287bd682-c54f-4913-bca4-d71892da1a4f"},"VSME-C04.000 DisclosureOfHowItHasAssessedTheExposureAndSensitivityOfItsAssetsActivitiesAndValueChainToTheseHazardsAndTransitionEvents":{"label_de":"DisclosureOfHowItHasAssessedTheExposureAndSensitivityOfItsAssetsActivitiesAndValueChainToTheseHazardsAndTransitionEvents","unit":null,"data_type":"text","is_required":false,"id":"c5f5e43f-6d4e-4f01-8f40-6d54db1f62ea"},"VSME-C04.000 DisclosureOfWhetherItHasUndertakenClimateChangeAdaptationActionsForAnyClimateRelatedHazardsAndTransitionEvents":{"label_de":"Disclosure of whether it has undertaken climate change adaptation actions for any climate related hazards and transition events","unit":null,"data_type":"boolean","is_required":false,"id":"6978f666-9303-495f-939d-4c5d400436ea"},"VSME-C04.000 PotentialAdverseEffectsOfClimateRisksThatMayAffectItsFinancialPerformanceOrBusinessOperationsInTheShortMediumOrLongTermIndicatingWhetherItAssessesTheRisksToBeHighMediumOrLow":{"label_de":"PotentialAdverseEffectsOfClimateRisksThatMayAffectItsFinancialPerformanceOrBusinessOperationsInTheShortMediumOrLongTermIndicatingWhetherItAssessesTheRisksToBeHighMediumOrLow","unit":null,"data_type":"text","is_required":false,"id":"5ebbae0c-e4b7-4c14-8365-a5fb3db60f22"},"VSME-C04.000 TimeHorizonsOfAnyClimateRelatedHazardsAndTransitionEventsIdentified":{"label_de":"TimeHorizonsOfAnyClimateRelatedHazardsAndTransitionEventsIdentified","unit":null,"data_type":"text","is_required":false,"id":"826e515e-40fa-45e4-93a2-c623ab5fed83"},"VSME-C05.000 FemaleToMaleRatioAtManagementLevelForTheReportingPeriod":{"label_de":"Female-to-male ratio at management level for the reporting period","unit":null,"data_type":"number","is_required":false,"id":"114a4c3c-c0c6-40eb-b42c-f6237e746559"},"VSME-C05.000 TotalNumberOfSelfEmployedWorkersWithoutPersonnelThatAreWorkingExclusivelyForTheUndertaking":{"label_de":"TotalNumberOfSelfEmployedWorkersWithoutPersonnelThatAreWorkingExclusivelyForTheUndertaking","unit":null,"data_type":"number","is_required":false,"id":"c1897bd8-d0fa-4295-8315-0d397e077663"},"VSME-C05.000 TotalNumberOfTemporaryWorkersProvidedByUndertakingsPrimarilyEngagedInEmploymentActivities":{"label_de":"TotalNumberOfTemporaryWorkersProvidedByUndertakingsPrimarilyEngagedInEmploymentActivities","unit":null,"data_type":"number","is_required":false,"id":"915d7325-16b5-4592-83d8-c5131b143fb5"},"VSME-C06.000 SpecificationOfOtherTypesOfContentCoveredByTheCodeOfConductOrHumanRightsPolicy":{"label_de":"Specification other types of content covered by the code of conduct or human rights policy","unit":null,"data_type":"text","is_required":false,"id":"50652c73-3d76-4d63-aee9-e412bb5fa8d1"},"VSME-C06.000 TypeOfContentCoveredByTheCodeOfConductOrHumanRightsPolicyForItsOwnWorkforce":{"label_de":"TypeOfContentCoveredByTheCodeOfConductOrHumanRightsPolicyForItsOwnWorkforce","unit":null,"data_type":"enum","is_required":false,"id":"4245cf7e-883a-4285-9c84-154cfca15242"},"VSME-C06.000 UndertakingHasACodeOfConductOrHumanRightsPolicyForItsOwnWorkforce":{"label_de":"Undertaking has a code of conduct or human rights policy for its own workforce","unit":null,"data_type":"boolean","is_required":false,"id":"e011004e-ebc8-48b3-bc93-3503e25e99c6"},"VSME-C06.000 UndertakingHasAComplaintHandlingMechanismForItsOwnWorkforce":{"label_de":"Undertaking has a complaint handling mechanism for its own workforce","unit":null,"data_type":"boolean","is_required":false,"id":"a9cbad68-25a2-43d5-a76f-8b922454b064"},"VSME-C07.000 DescriptionOfActionsTakeToAddressTheConfirmedIncidents":{"label_de":"Description of actions take to address the confirmed incidents","unit":null,"data_type":"text","is_required":false,"id":"27207a85-fbe3-43e9-b6fa-a08aa9242262"},"VSME-C07.000 SpecificationOfAnyConfirmedIncidentInvolvingWorkersInTheValueChainAffectedCommunitiesConsumersAndEndUsers":{"label_de":"SpecificationOfAnyConfirmedIncidentInvolvingWorkersInTheValueChainAffectedCommunitiesConsumersAndEndUsers","unit":null,"data_type":"text","is_required":false,"id":"338aa244-d168-41d1-bd6f-936b76a289f0"},"VSME-C07.000 SpecificationOfOtherHumanRightsRelatedToTheConfirmedIncident":{"label_de":"SpecificationOfOtherHumanRightsRelatedToTheConfirmedIncident","unit":null,"data_type":"text","is_required":false,"id":"835b2318-94e4-4c84-8ca2-aae81ceeb564"},"VSME-C07.000 TypeOfHumanRightRelatedToTheConfirmedIncident":{"label_de":"Type of human right related to the confirmed incident","unit":null,"data_type":"enum","is_required":false,"id":"d6319512-6bce-4831-9d33-9c921f108c09"},"VSME-C07.000 UndertakingHasConfirmedHumanRightsIncidentsInItsOwnWorkforce":{"label_de":"Undertaking has confirmed human rights incidents in its own workforce","unit":null,"data_type":"boolean","is_required":false,"id":"c6369aa8-ac0e-4117-bc44-b0aed1119740"},"VSME-C07.000 UndertakingIsAwareOfAnyConfirmedIncidentsInvolvingWorkersInTheValueChainAffectedCommunitiesConsumersAndEndUsers":{"label_de":"Undertaking aware of any confirmed incidents involving workers in the value chain, affected communities, consumers and end-users","unit":null,"data_type":"boolean","is_required":false,"id":"b92aebf4-66c6-43e7-abe4-f6c16206995f"},"VSME-C08.000 RevenueDerivedFromChemicalProduction":{"label_de":"Revenue derived from chemical production","unit":"EUR","data_type":"number","is_required":false,"id":"d409602d-937f-459d-9b28-79972ab91756"},"VSME-C08.000 RevenueDerivedFromCoal":{"label_de":"Revenue derived from coal","unit":"EUR","data_type":"number","is_required":false,"id":"46fadcf3-b96e-4c80-b08c-3ff508e4a1d3"},"VSME-C08.000 RevenueDerivedFromControversialWeaponsAntiPersonnelMinesClusterMunitionsChemicalWeaponsAndBiologicalWeapons":{"label_de":"Revenue derived from controversial weapons (anti-personnel mines, cluster munitions, chemical weapons and biological weapons)","unit":"EUR","data_type":"number","is_required":false,"id":"3b6b03c8-b631-4fe0-a4bd-a3356b57aec7"},"VSME-C08.000 RevenueDerivedFromCultivationAndProductionOfTobacco":{"label_de":"RevenueDerivedFromCultivationAndProductionOfTobacco","unit":"EUR","data_type":"number","is_required":false,"id":"63ea851b-99aa-4510-ab7e-761425fb4445"},"VSME-C08.000 RevenueDerivedFromGas":{"label_de":"Revenue derived from gas","unit":"EUR","data_type":"number","is_required":false,"id":"1c6fca2a-11a8-47fa-90af-318508fa475f"},"VSME-C08.000 RevenueDerivedFromOil":{"label_de":"Revenue derived from oil","unit":"EUR","data_type":"number","is_required":false,"id":"cb8b739e-9453-48ca-b083-1cf2bc1debdf"},"VSME-C08.000 TotalRevenuesDerivedFromFossilFuelCoalOilAndGasSector":{"label_de":"Total revenues derived from fossil (fuel, coal and gas) sector","unit":"EUR","data_type":"number","is_required":false,"id":"10221c97-aed4-4351-a414-362ff73928f9"},"VSME-C08.100 UndertakingsAreExcludedFromAnyEuReferenceBenchmarksThatAreAlignedWithTheParisAgreement":{"label_de":"UndertakingsAreExcludedFromAnyEuReferenceBenchmarksThatAreAlignedWithTheParisAgreement","unit":null,"data_type":"boolean","is_required":false,"id":"012599f0-ee3d-4075-a8e9-5c9309b0a2fd"},"VSME-C09.000 GenderDiversityRatioInGovernanceBody":{"label_de":"GenderDiversityRatioInGovernanceBody","unit":null,"data_type":"number","is_required":false,"id":"5b44ca11-e34a-4f59-ad66-f2a5420b1d06"},"VSME-D99.000 DisclosureOfAnyOtherEnvironmentalAndOrEntitySpecificEnvironmentalDisclosures":{"label_de":"DisclosureOfAnyOtherEnvironmentalAndOrEntitySpecificEnvironmentalDisclosures","unit":null,"data_type":"text","is_required":false,"id":"1384c0a3-d93c-43c7-9083-9dce58f02975"},"VSME-D99.000 DisclosureOfAnyOtherGeneralAndOrEntitySpecificInformation":{"label_de":"DisclosureOfAnyOtherGeneralAndOrEntitySpecificInformation","unit":null,"data_type":"text","is_required":false,"id":"df2c1ab1-ea2f-4efe-b6cb-9b5f9bc17f89"},"VSME-D99.000 DisclosureOfAnyOtherGovernanceAndOrEntitySpecificGovernanceDisclosures":{"label_de":"DisclosureOfAnyOtherGovernanceAndOrEntitySpecificGovernanceDisclosures","unit":null,"data_type":"text","is_required":false,"id":"53c7156b-84b1-406f-a299-e95cf9f0edba"},"VSME-D99.000 DisclosureOfAnyOtherSocialAndOrEntitySpecificSocialDisclosures":{"label_de":"DisclosureOfAnyOtherSocialAndOrEntitySpecificSocialDisclosures","unit":null,"data_type":"text","is_required":false,"id":"fc022060-7f51-4a50-bcc3-e7df43bcbc20"}};
export const PROD_WORKSHEETS: Record<string, { id: string; title_de: string }> = {"VSME-B01.000":{"id":"9ddd8945-4cb6-47fa-88dd-71d01271f12b","title_de":"General information - Basis for Preparation"},"VSME-B01.100":{"id":"fa00f041-7af3-453e-9e08-15c01096c9d1","title_de":"General information - List of subsidiaries"},"VSME-B01.200":{"id":"e52f7973-52dd-4ee5-aeb8-4c5d59bd1f15","title_de":"General information - List of sites"},"VSME-B02.000":{"id":"06d340aa-d5c6-48ad-9291-575af6949902","title_de":"General information - Practices, policies and/or future initiatives for transitioning towards a more sustainable economy"},"VSME-B02.100":{"id":"fec41861-9452-44ac-bfb2-a4b8782a2503","title_de":"General information - Cooperative specific disclosures"},"VSME-B03.000":{"id":"9a0d2671-dca4-4516-beb0-b24f2c7f3a6a","title_de":"Environment - Total Energy Consumption"},"VSME-B03.100":{"id":"735bf8a3-20da-4ad6-a74f-27c7cc2492df","title_de":"Environment - Breakdown of energy consumption"},"VSME-B03.200":{"id":"0acaaefa-0dba-4d60-a5fc-f28dce6013ff","title_de":"Environment - Estimated Greenhouse Gas Emissions"},"VSME-B03.300":{"id":"ee7c801c-52c8-41ee-a193-f9acd11129ed","title_de":"Environment - Greenhouse Gas Emissions intensity"},"VSME-B04.000":{"id":"11220be4-9bb3-4bfb-bae7-61263d96a9d8","title_de":"Environment - Pollution of air, water and soil: availability of public disclosure"},"VSME-B04.100":{"id":"4764f05d-14d0-4041-89d5-3bbdd6bc3c70","title_de":"Environment - Pollution of air, water and soil: amount of emissions"},"VSME-B05.000":{"id":"711f5123-b8b6-40a8-9474-b9b71474e361","title_de":"Environment - Sites in biodiversity sensitive areas"},"VSME-B05.100":{"id":"64aa0490-6f15-425a-8c8d-2a0d8fbcdbc9","title_de":"Environment - Biodiversity - on Land-use"},"VSME-B06.000":{"id":"85539063-3b5e-4010-afd9-7441e4689584","title_de":"Environment - Water Withdrawal"},"VSME-B06.100":{"id":"9aa601e2-62bc-4480-a7ba-b24079e70b91","title_de":"Environment - Water Consumption"},"VSME-B07.000":{"id":"5596113d-ac0d-412a-96df-3f2ae63ed4bc","title_de":"Environment - Description of circular economy principles"},"VSME-B07.100":{"id":"8b6b62f2-332d-4548-9482-a2b6f4242a55","title_de":"Environment - Breakdown of waste by type"},"VSME-B07.200":{"id":"bf7fa492-8009-42f2-ad47-d3311bd358e8","title_de":"Environment - Total Hazardous and Non-Hazardous waste"},"VSME-B07.300":{"id":"13e3df1f-5ca0-4621-a28e-3976d7cdff76","title_de":"Environment - Breakdown of annual mass-flow of relevant materials used by the undertaking"},"VSME-B07.400":{"id":"ed025d78-d027-44ba-95be-016686cb6636","title_de":"Environment - Total annual mass-flow of materials used by the undertaking"},"VSME-B08.000":{"id":"6409fc96-1e9f-428a-995f-f46d874b5133","title_de":"Social - Workforce - General characteristics: type of contract"},"VSME-B08.100":{"id":"a594ff92-00a3-4f19-8e50-c740f6a75f28","title_de":"Social - Workforce - General characteristics: gender"},"VSME-B08.200":{"id":"e4372886-0e89-44cd-b3d4-a406c53a9124","title_de":"Social - Workforce - General characteristics: country of employment"},"VSME-B08.300":{"id":"e7d43d47-2055-4c6b-ab0c-0d01dd0d6cef","title_de":"Social - Workforce - General characteristics: turnover rate"},"VSME-B09.000":{"id":"d20b28b1-9364-4a31-8f80-a76c0adfb548","title_de":"Social - Workforce - Health and safety"},"VSME-B10.000":{"id":"3ebb6ea0-00c2-4200-86eb-462d63680993","title_de":"Social - Workforce - Remuneration, collective bargaining and training"},"VSME-B11.000":{"id":"6e334462-71d3-475d-8cc4-0a6ef3497c66","title_de":"Governance - Convictions and fines for corruption and bribery"},"VSME-C01.000":{"id":"230d78f6-2682-44ce-9423-edcbf5a88110","title_de":"General information - Strategy: Business Model and Sustainability – Related Initiatives"},"VSME-C02.000":{"id":"1b692d34-26f4-44ce-9c8e-f125bbdee56a","title_de":"General information - Description of practices, policies and/or future initiatives for transitioning towards a more sustainable economy"},"VSME-C03.000":{"id":"9ffbbb58-8d9f-49e4-98f1-4e74540b7b98","title_de":"Environment - Greenhouse Gas Emissions Reduction Baseline and Target Year"},"VSME-C03.200":{"id":"9aad0eae-e4ac-4026-a120-42c2fe0f3704","title_de":"Environment - Disclosure of list of main actions the entity seeks to achieve its targets"},"VSME-C03.300":{"id":"9b52639f-b753-457d-ac30-354a6168dd71","title_de":"Environment - Transition plan for undertakings operating in high climate impact sectors"},"VSME-C04.000":{"id":"8a38581f-68e8-43d9-88de-9026ac2fd0e7","title_de":"Environment - Climate risks"},"VSME-C05.000":{"id":"bec4b290-1c77-45db-bef4-c2b8a40db5fa","title_de":"Social - Additional (general) workforce characteristics"},"VSME-C06.000":{"id":"c193a34f-a463-4064-ad80-32e64bde2cd0","title_de":"Social - Additional own workforce information - Human rights policies and processes"},"VSME-C07.000":{"id":"17d13ae1-1b3c-4fa7-8416-622748020e95","title_de":"Social - Severe negative human rights incidents"},"VSME-C08.000":{"id":"5f447ae1-9139-461c-97a0-b89cf01454c0","title_de":"Governance - Revenues derived from activities"},"VSME-C08.100":{"id":"b40da2a9-6c59-43e9-8700-5995c53410e8","title_de":"Governance - Exclusion from EU benchmarks"},"VSME-C09.000":{"id":"d754611b-b616-4438-8ec2-52a82977ad52","title_de":"Governance - Gender diversity ratio in the governance body"},"VSME-D99.000":{"id":"b532bc39-247d-4b9e-9769-7320039f641b","title_de":"Other and/or entity specific information"}};
/** the 10 prod equation rows (EQ-01 … EQ-10) with their source_quote — captured for the record; none is a cue of this task. */
export const PROD_EQUATIONS: Record<string, { worksheet: string; id: string; formula: string; formula_md5: string; output_symbol: string; clause: string; verification_status: string; source_quote: string | null; verification_quote: string | null }> = {
 "VSME-EQ-01": {
  "worksheet": "VSME-B01.000",
  "id": "e5504d52-5573-4a0d-ab8a-4491ada113a8",
  "formula": "NumberOfPermanentContractEmployees + NumberOfTemporaryContractEmployees",
  "formula_md5": "22afb68e310c1a42b2c36d299c154b52",
  "output_symbol": "NumberOfEmployees",
  "clause": "VSME B1 ¶24(e)(v)",
  "verification_status": "imported_unverified",
  "source_quote": "VSME Standard, B1 - Basis for preparation, para 24(e)(v), p.8 (VA): \"The undertaking shall disclose: ... (e) the following information: ... v. number of employees in headcount or full-time equivalents\". The permanent/temporary split summed here is the printed breakdown in B8 - Workforce, para 39(a), p.10: \"The undertaking shall disclose the number of employees in headcount or full-time equivalent for the following metrics: (a) type of employment contract (temporary or permanent)\". Total = encoder's aggregation of the two printed contract-type datapoints.",
  "verification_quote": null
 },
 "VSME-EQ-02": {
  "worksheet": "VSME-B03.200",
  "id": "940230df-6389-4626-b77e-070728c13b45",
  "formula": "TotalGrossLocationBasedScope1AndScope2GHGEmissions + GrossScope3GreenhouseGasEmissions",
  "formula_md5": "aa284123b26524f4a646b13f56ccb0f4",
  "output_symbol": "TotalGrossLocationBasedGHGEmissions",
  "clause": "VSME B3 ¶50-53",
  "verification_status": "imported_unverified",
  "source_quote": "VSME Standard (VA). Components printed: gross Scope 1 + location-based Scope 2 under B3 para 30, p.9: \"(a) the Scope 1 GHG emissions in tCO2eq (from owned or controlled sources); and (b) the location-based Scope 2 emissions in tCO2eq ...\"; Scope 3 under Comprehensive C1 para 50, p.12: \"Depending on the type of activities carried out by the undertaking, disclosing a quantification of its Scope 3 GHG emissions can be appropriate ...\" presented per para 53 \"together with the information required under B3 - Energy and greenhouse gas emissions\". NOTE: the grand total (Scope 1+2 location + Scope 3) is NOT printed as a para 30 requirement; it is the encoder's / XBRL-taxonomy aggregation of the printed datapoints.",
  "verification_quote": null
 },
 "VSME-EQ-03": {
  "worksheet": "VSME-B03.200",
  "id": "b2930ef8-b499-409d-abc2-aa41e1d84ad7",
  "formula": "GrossScope1GreenhouseGasEmissions + GrossLocationBasedScope2GreenhouseGasEmissions",
  "formula_md5": "ad9fee8aae727fa9e5e88ff2f7fedfbd",
  "output_symbol": "TotalGrossLocationBasedScope1AndScope2GHGEmissions",
  "clause": "VSME B3 ¶30",
  "verification_status": "imported_unverified",
  "source_quote": "VSME Standard, B3 - Energy and greenhouse gas emissions, para 30, p.9 (VA): \"The undertaking shall disclose its estimated gross greenhouse gas (GHG) emissions in tons of CO2 equivalent (tCO2eq) considering the content of the GHG Protocol Corporate Standard (version 2004), including: (a) the Scope 1 GHG emissions in tCO2eq (from owned or controlled sources); and (b) the location-based Scope 2 emissions in tCO2eq (i.e. emissions from the generation of purchased energy, such as electricity, heat, steam or cooling).\" Total (location-based Scope 1+2) = encoder's aggregation of the two printed datapoints.",
  "verification_quote": null
 },
 "VSME-EQ-04": {
  "worksheet": "VSME-B03.200",
  "id": "7d686865-d348-4a84-a958-5db9f2ff2655",
  "formula": "TotalGrossMarketBasedScope1AndScope2GHGEmissions + GrossScope3GreenhouseGasEmissions",
  "formula_md5": "8cce431e0a41f3c48cae91ca17976517",
  "output_symbol": "TotalGrossMarketBasedGHGEmissions",
  "clause": "VSME B3 ¶50-53",
  "verification_status": "imported_unverified",
  "source_quote": "VSME Standard (VA). Components printed: Scope 1 under B3 para 30(a), p.9 \"(a) the Scope 1 GHG emissions in tCO2eq (from owned or controlled sources)\"; market-based Scope 2 under B3 guidance para 109, p.23: \"Undertakings may also want to provide their market-based Scope 2 figures. Emission factors for market-based Scope 2 emissions reflect the contractual arrangements of the undertaking with its energy suppliers ...\"; Scope 3 under C1 para 50/53, p.12. NOTE: market-based Scope 2 is guidance (para 109), NOT a para 30 disclosure requirement; the market-based Scope 1+2+3 total is the encoder's / XBRL-taxonomy aggregation, not printed VSME prose.",
  "verification_quote": null
 },
 "VSME-EQ-05": {
  "worksheet": "VSME-B03.200",
  "id": "1f033ed0-2b62-43b5-a880-c114b910d0d8",
  "formula": "GrossMarketBasedScope2GreenhouseGasEmissions + GrossScope1GreenhouseGasEmissions",
  "formula_md5": "4842ff88f8cb32813179ae3144280b04",
  "output_symbol": "TotalGrossMarketBasedScope1AndScope2GHGEmissions",
  "clause": "VSME B3 ¶30",
  "verification_status": "imported_unverified",
  "source_quote": "VSME Standard (VA). Components printed: Scope 1 under B3 para 30(a), p.9 \"(a) the Scope 1 GHG emissions in tCO2eq (from owned or controlled sources)\"; market-based Scope 2 under B3 guidance para 109, p.23: \"Undertakings may also want to provide their market-based Scope 2 figures. Emission factors for market-based Scope 2 emissions reflect the contractual arrangements of the undertaking with its energy suppliers ...\". NOTE: para 30 requires only location-based Scope 2; market-based Scope 2 appears only in guidance para 109. The market-based Scope 1+2 total is the encoder's / XBRL-taxonomy aggregation, not printed para 30 prose.",
  "verification_quote": null
 },
 "VSME-EQ-06": {
  "worksheet": "VSME-B07.100",
  "id": "fe1543f8-2604-4d0a-96b4-0951117d3dd4",
  "formula": "WasteDirectedToDisposalMass + WasteDivertedToRecycleOrReuseMass",
  "formula_md5": "87e81e0d96859233bec22b6f78d51201",
  "output_symbol": "TotalWasteRecycledReusedAndDirectedToDisposalMass",
  "clause": "VSME B7 ¶38(a-b)",
  "verification_status": "imported_unverified",
  "source_quote": "VSME Standard, B7 - Resource use, circular economy and waste management, para 38(b), p.10 (VA): \"The undertaking shall disclose: ... (b) the total annual waste diverted to recycling or reuse\". The disposal/diversion split summed here is the printed B7 guidance table in para 170, p.37: \"Total waste generated, of which: Waste diverted to recycle or reuse | Waste directed to disposal\". Units of weight per para 168, p.37 (\"report such information in units of weight (e.g. kg or tonnes)\"). Total = encoder's aggregation of the two printed table columns (mass).",
  "verification_quote": null
 },
 "VSME-EQ-07": {
  "worksheet": "VSME-B07.100",
  "id": "879f384c-61d2-47c2-a94f-79d7a9c7ea0c",
  "formula": "WasteDirectedToDisposalVolume + WasteDivertedToRecycleOrReuseVolume",
  "formula_md5": "2a0c5506dd9d77d78da20791a609ae2b",
  "output_symbol": "TotalWasteRecycledReusedAndDirectedToDisposalVolume",
  "clause": "VSME B7 ¶38(a-b)",
  "verification_status": "imported_unverified",
  "source_quote": "VSME Standard, B7, para 38(b), p.10 (VA): \"The undertaking shall disclose: ... (b) the total annual waste diverted to recycling or reuse\". Disposal/diversion split = printed B7 guidance table in para 170, p.37: \"Total waste generated, of which: Waste diverted to recycle or reuse | Waste directed to disposal\". Volume variant per para 168, p.37: \"should the units of weight be considered an inappropriate unit by the undertaking, they may alternatively disclose the aforementioned metrics in volumes (e.g. m3) instead\". Total = encoder's aggregation of the two printed table columns (volume).",
  "verification_quote": null
 },
 "VSME-EQ-08": {
  "worksheet": "VSME-B07.200",
  "id": "b53d4867-d7e4-4c52-a7e7-7afcffc5fcde",
  "formula": "TotalHazardousWasteGeneratedMass + TotalNonHazardousWasteGeneratedMass",
  "formula_md5": "d67ec1294d2a74b26e82f33c1b08eb92",
  "output_symbol": "TotalWasteGeneratedMass",
  "clause": "VSME B7 ¶38(a)",
  "verification_status": "imported_unverified",
  "source_quote": "VSME Standard, B7 - Resource use, circular economy and waste management, para 38(a), p.10 (VA): \"The undertaking shall disclose: (a) the total annual generation of waste broken down by type (non-hazardous and hazardous)\". The B7 guidance table in para 170, p.37 lists rows \"Non-hazardous waste\" and \"Hazardous waste\" summing to \"Total waste generated\". Units of weight per para 168, p.37. Total = encoder's aggregation of the two printed waste-type datapoints (mass).",
  "verification_quote": null
 },
 "VSME-EQ-09": {
  "worksheet": "VSME-B07.200",
  "id": "83307c4d-d8b9-4a70-b4b5-ead0cbbde29a",
  "formula": "TotalHazardousWasteGeneratedVolume + TotalNonHazardousWasteGeneratedVolume",
  "formula_md5": "a98e9ec567d044ffdf64f12840373933",
  "output_symbol": "TotalWasteGeneratedVolume",
  "clause": "VSME B7 ¶38(a)",
  "verification_status": "imported_unverified",
  "source_quote": "VSME Standard, B7, para 38(a), p.10 (VA): \"The undertaking shall disclose: (a) the total annual generation of waste broken down by type (non-hazardous and hazardous)\". B7 guidance table para 170, p.37 rows \"Non-hazardous waste\" and \"Hazardous waste\" sum to \"Total waste generated\". Volume variant per para 168, p.37: \"they may alternatively disclose the aforementioned metrics in volumes (e.g. m3) instead\". Total = encoder's aggregation of the two printed waste-type datapoints (volume).",
  "verification_quote": null
 },
 "VSME-EQ-10": {
  "worksheet": "VSME-C08.000",
  "id": "519039aa-86c5-469b-9047-228ad14aa6fa",
  "formula": "RevenueDerivedFromCoal + RevenueDerivedFromOil + RevenueDerivedFromGas",
  "formula_md5": "b237cd56939d62cb5ebf169f73bc5333",
  "output_symbol": "TotalRevenuesDerivedFromFossilFuelCoalOilAndGasSector",
  "clause": "VSME C8 ¶63(c)",
  "verification_status": "imported_unverified",
  "source_quote": "VSME Standard, C8 - Revenues from certain sectors and exclusion from EU reference benchmarks, para 63(c), p.14 (VA): \"If the undertaking is active in one or more of the following sectors, it shall disclose its related revenues in the sector(s): ... (c) fossil fuel (coal, oil and gas) sector (i.e. the undertaking derives revenues from exploration, mining, extraction, production, processing, storage, refining or distribution, including transportation, storage and trade, of fossil fuels as defined in Article 2, point (62), of Regulation (EU) 2018/1999 ...), including a disaggregation of revenues derived from coal, oil and gas\". Total = encoder's aggregation of the printed coal/oil/gas disaggregation.",
  "verification_quote": null
 }
};
/** Cue text for a verification_quote: the CR's paragraph wording (description) or its source_quote, tagged with the citation the plan prescribes. */
export function pq(code: string, part: 'description' | 'source_quote' = 'description'): string {
  const r = PROD_QUOTES[code];
  if (!r) throw new Error(`no prod quote for ${code}`);
  const text = part === 'source_quote' ? r.source_quote : r.description;
  if (!text) throw new Error(`${code} has no ${part}`);
  const para = /Para [0-9]+(?:\([a-z]\))?/.exec(r.description)?.[0] ?? r.clause;
  return `${text} [prod verification_quote (${para}, ${code})]`;
}
