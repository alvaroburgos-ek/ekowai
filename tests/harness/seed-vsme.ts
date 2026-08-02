/**
 * EFRAG VSME — "Voluntary Sustainability Reporting Standard for non-listed SMEs"
 * (version 2026-02-01) — CURRENT-PROD fixture for the REAL save-path
 * gate-execution-proof harness.
 *
 * PROVENANCE (R-1/R-2, read honestly):
 *   - TOPOLOGY + all gate conditions / equation formula strings / field
 *     data-types are transcribed VERBATIM from the live-pulled prod dump
 *       scratchpad/vsme_encoding.json   (prod id ec9216f5-cf8b-482a-8ae9-81af334e7522,
 *       project vadsmshzebefjreqcicl), pulled live via the Management API THIS
 *       session (mcp execute_sql was down). That dump is the R-1 ground truth.
 *   - R-5 CORRECTION: VSME was long believed "source-absent (internal EFRAG
 *     build)". That is WRONG. The rendered EFRAG VSME Standard PDF EXISTS at
 *       C:\Users\Ekowai\Desktop\environmental-reporting service\01_Referenz\VSME Standard.pdf
 *     and was used as SR-3 ground truth this wave. Content verification is
 *     VA-grade (rendered-PDF paragraph anchors captured in-session).
 *
 * Topology (verified live): 40 worksheets · 9 block gates · 22 warn gates ·
 * 10 equations · 144 fields.
 *
 * The 9 BLOCK gates are ALL single-symbol `X IS NOT NULL` existence checks —
 * the engine (evaluate.ts) parses `IS NOT NULL` as a first-class `exists` node
 * (negate=true) that ENFORCES: present ⇒ pass, absent ⇒ fail. This is NOT the
 * broken trap-2 `!= null`/`!= ''` shape (which the corpus doctrine flags); it is
 * a supported, definite-verdict existence predicate. Each maps to a "shall
 * disclose" mandatory datapoint in the VSME Standard PDF:
 *   VSME-CR-B01-01 BasisForPreparation IS NOT NULL   [B01.000, local]   §24(a) p.8
 *   VSME-CR-B01-02 BasisForReporting IS NOT NULL      [B01.000, local]   §24(c) p.8
 *   VSME-CR-B03-01 TotalEnergyConsumption IS NOT NULL [B03.000, local]   §29    p.9
 *   VSME-CR-B03-02 GrossScope1GreenhouseGasEmissions IS NOT NULL         [B03.200, local]  §30(a) p.9
 *   VSME-CR-B03-03 GrossLocationBasedScope2GreenhouseGasEmissions IS NOT NULL [B03.200, local] §30(b) p.9
 *   VSME-CR-B06-01 TotalAmountOfWaterWithdrawnFromAllSites IS NOT NULL   [B06.000, local]  §35 p.10
 *   VSME-CR-B07-01 UndertakingAppliesCircularEconomyPrinciples IS NOT NULL
 *                    [gate on B01.000 template; field homed on B07.000 → CROSS-WS fallback] §37 p.10
 *   VSME-CR-B09-01 NumberOfRecordableWorkRelatedAccidentsInTheReportingPeriod IS NOT NULL
 *                    [B09.000, local]  §41(a) p.10
 *   VSME-CR-B09-02 NumberOfFatalitiesAsAResultOfWorkRelatedInjuriesAndWorkRelatedIllHealth IS NOT NULL
 *                    [B09.000, local]  §41(b) p.10
 *
 * The 10 equations are all fixed 2-/3-term additive aggregations of their own
 * declared component fields (all number-typed, all present, dot/integer literals,
 * `+` only) → each computes through the REAL evaluateFormula. No Σ-over-i, no
 * comma-decimal, no symbol/case mismatch. Source anchors:
 *   NumberOfEmployees = Permanent + Temporary                         §24(e)(v)+§39(a) p.8/10 (encoding-introduced headcount total)
 *   TotalGrossLocationBasedScope1AndScope2 = Scope1 + LocScope2       §30(a)+(b) p.9
 *   TotalGrossLocationBasedGHG = (S1+S2) + Scope3                     §30 + §50-53 p.9/12
 *   TotalGrossMarketBasedScope1AndScope2 = MktScope2 + Scope1         GHG-Protocol market-based (comprehensive)
 *   TotalGrossMarketBasedGHG = (mkt S1+S2) + Scope3
 *   TotalRevenuesDerivedFromFossilFuel = Coal + Oil + Gas            §63(c) p.14 ("disaggregation ... coal, oil and gas")
 *   TotalWasteGeneratedMass = Hazardous + NonHazardous               §38(a) p.10
 *   TotalWasteGeneratedVolume = Hazardous + NonHazardous
 *   TotalWasteRecycledReusedAndDirectedToDisposalMass = Disposal + DivertedToRecycleOrReuse §38(a)/(b) p.10
 *   TotalWasteRecycledReusedAndDirectedToDisposalVolume = Disposal + DivertedToRecycleOrReuse
 *
 * Nothing is applied to prod, nothing is committed.
 */
import type postgres from 'postgres';

type Sev = 'block' | 'warn';
type FType = 'boolean' | 'text' | 'number' | 'enum' | 'date';

/** All 31 prod compliance gates (9 block + 22 warn), conditions + severities +
 *  HOME worksheet VERBATIM from the live prod dump. Nothing is fixed here. */
export const VSME_GATES: ReadonlyArray<{ ws: string; code: string; cond: string; sev: Sev }> = [
  { ws: 'VSME-B01.000', code: 'VSME-CR-B01-01', sev: 'block', cond: 'BasisForPreparation IS NOT NULL' },
  { ws: 'VSME-B01.000', code: 'VSME-CR-B01-02', sev: 'block', cond: 'BasisForReporting IS NOT NULL' },
  { ws: 'VSME-B01.000', code: 'VSME-CR-B01-03', sev: 'warn', cond: 'UndertakingsLegalForm IS NOT NULL' },
  { ws: 'VSME-B01.000', code: 'VSME-CR-B01-04', sev: 'warn', cond: 'NaceSectorClassificationCodes IS NOT NULL' },
  { ws: 'VSME-B01.000', code: 'VSME-CR-B01-05', sev: 'warn', cond: 'Assets IS NOT NULL' },
  { ws: 'VSME-B01.000', code: 'VSME-CR-B01-06', sev: 'warn', cond: 'Turnover IS NOT NULL' },
  { ws: 'VSME-B01.000', code: 'VSME-CR-B01-07', sev: 'warn', cond: 'NumberOfEmployees IS NOT NULL' },
  { ws: 'VSME-B01.000', code: 'VSME-CR-B01-08', sev: 'warn', cond: 'CountryOfPrimaryOperationsAndLocationOfSignificantAssets IS NOT NULL' },
  { ws: 'VSME-B01.200', code: 'VSME-CR-B01-09', sev: 'warn', cond: 'GPSLocationOfSite IS NOT NULL' },
  { ws: 'VSME-B03.000', code: 'VSME-CR-B03-01', sev: 'block', cond: 'TotalEnergyConsumption IS NOT NULL' },
  { ws: 'VSME-B03.200', code: 'VSME-CR-B03-02', sev: 'block', cond: 'GrossScope1GreenhouseGasEmissions IS NOT NULL' },
  { ws: 'VSME-B03.200', code: 'VSME-CR-B03-03', sev: 'block', cond: 'GrossLocationBasedScope2GreenhouseGasEmissions IS NOT NULL' },
  { ws: 'VSME-B03.300', code: 'VSME-CR-B03-04', sev: 'warn', cond: 'TotalLocationBasedGreenhouseGasEmissionsIntensityValue IS NOT NULL' },
  { ws: 'VSME-B05.000', code: 'VSME-CR-B05-01', sev: 'warn', cond: 'SiteLocatedInABiodiversitySensitiveArea IS NOT NULL' },
  { ws: 'VSME-B06.000', code: 'VSME-CR-B06-01', sev: 'block', cond: 'TotalAmountOfWaterWithdrawnFromAllSites IS NOT NULL' },
  { ws: 'VSME-B06.000', code: 'VSME-CR-B06-02', sev: 'warn', cond: 'AmountOfWaterWithdrawnAtSitesLocatedInAreasOfHighWaterStress IS NOT NULL' },
  { ws: 'VSME-B01.000', code: 'VSME-CR-B07-01', sev: 'block', cond: 'UndertakingAppliesCircularEconomyPrinciples IS NOT NULL' },
  { ws: 'VSME-B07.200', code: 'VSME-CR-B07-02', sev: 'warn', cond: 'TotalWasteGeneratedMass IS NOT NULL' },
  { ws: 'VSME-B08.000', code: 'VSME-CR-B08-01', sev: 'warn', cond: 'NumberOfPermanentContractEmployees IS NOT NULL AND NumberOfTemporaryContractEmployees IS NOT NULL' },
  { ws: 'VSME-B08.100', code: 'VSME-CR-B08-02', sev: 'warn', cond: 'NumberOfMaleEmployees IS NOT NULL AND NumberOfFemaleEmployees IS NOT NULL' },
  { ws: 'VSME-B08.300', code: 'VSME-CR-B08-03', sev: 'warn', cond: 'EmployeeTurnoverRate IS NOT NULL' },
  { ws: 'VSME-B09.000', code: 'VSME-CR-B09-01', sev: 'block', cond: 'NumberOfRecordableWorkRelatedAccidentsInTheReportingPeriod IS NOT NULL' },
  { ws: 'VSME-B09.000', code: 'VSME-CR-B09-02', sev: 'block', cond: 'NumberOfFatalitiesAsAResultOfWorkRelatedInjuriesAndWorkRelatedIllHealth IS NOT NULL' },
  { ws: 'VSME-B09.000', code: 'VSME-CR-B09-03', sev: 'warn', cond: 'RateOfRecordableWorkRelatedAccidentsInTheReportingPeriod IS NOT NULL' },
  { ws: 'VSME-B10.000', code: 'VSME-CR-B10-01', sev: 'warn', cond: 'EmployeesReceivePayEqualOrAboveMinimumWageDeterminedByNationalLawOrCollectiveAgreement IS NOT NULL' },
  { ws: 'VSME-B10.000', code: 'VSME-CR-B10-02', sev: 'warn', cond: 'PercentageOfEmployeesCoveredByCollectiveBargainingAgreements IS NOT NULL' },
  { ws: 'VSME-B11.000', code: 'VSME-CR-B11-01', sev: 'warn', cond: 'TotalNumberOfConvictionsForTheViolationOfAntiCorruptionAndAntiBriberyLaws IS NOT NULL' },
  { ws: 'VSME-C01.000', code: 'VSME-CR-C01-01', sev: 'warn', cond: 'DescriptionOfSignificantGroupsOfProductsAndOrServicesOffered IS NOT NULL' },
  { ws: 'VSME-C06.000', code: 'VSME-CR-C06-01', sev: 'warn', cond: 'UndertakingHasACodeOfConductOrHumanRightsPolicyForItsOwnWorkforce IS NOT NULL' },
  { ws: 'VSME-C08.100', code: 'VSME-CR-C08-01', sev: 'warn', cond: 'UndertakingsAreExcludedFromAnyEuReferenceBenchmarksThatAreAlignedWithTheParisAgreement IS NOT NULL' },
  { ws: 'VSME-C09.000', code: 'VSME-CR-C09-01', sev: 'warn', cond: 'GenderDiversityRatioInGovernanceBody IS NOT NULL' },
];

/** The 10 equations, verbatim from prod. Driven through the REAL evaluateFormula. */
export const VSME_EQUATIONS = [
  { num: 'EQ-B01-emp',      out: 'NumberOfEmployees',                                homeWs: 'VSME-B01.000', formula: 'NumberOfPermanentContractEmployees + NumberOfTemporaryContractEmployees' },
  { num: 'EQ-B03-locGHG',   out: 'TotalGrossLocationBasedGHGEmissions',             homeWs: 'VSME-B03.200', formula: 'TotalGrossLocationBasedScope1AndScope2GHGEmissions + GrossScope3GreenhouseGasEmissions' },
  { num: 'EQ-B03-locS12',   out: 'TotalGrossLocationBasedScope1AndScope2GHGEmissions', homeWs: 'VSME-B03.200', formula: 'GrossScope1GreenhouseGasEmissions + GrossLocationBasedScope2GreenhouseGasEmissions' },
  { num: 'EQ-B03-mktGHG',   out: 'TotalGrossMarketBasedGHGEmissions',               homeWs: 'VSME-B03.200', formula: 'TotalGrossMarketBasedScope1AndScope2GHGEmissions + GrossScope3GreenhouseGasEmissions' },
  { num: 'EQ-B03-mktS12',   out: 'TotalGrossMarketBasedScope1AndScope2GHGEmissions', homeWs: 'VSME-B03.200', formula: 'GrossMarketBasedScope2GreenhouseGasEmissions + GrossScope1GreenhouseGasEmissions' },
  { num: 'EQ-C08-fossil',   out: 'TotalRevenuesDerivedFromFossilFuelCoalOilAndGasSector', homeWs: 'VSME-C08.000', formula: 'RevenueDerivedFromCoal + RevenueDerivedFromOil + RevenueDerivedFromGas' },
  { num: 'EQ-B07-wMass',    out: 'TotalWasteGeneratedMass',                         homeWs: 'VSME-B07.200', formula: 'TotalHazardousWasteGeneratedMass + TotalNonHazardousWasteGeneratedMass' },
  { num: 'EQ-B07-wVol',     out: 'TotalWasteGeneratedVolume',                       homeWs: 'VSME-B07.200', formula: 'TotalHazardousWasteGeneratedVolume + TotalNonHazardousWasteGeneratedVolume' },
  { num: 'EQ-B07-rMass',    out: 'TotalWasteRecycledReusedAndDirectedToDisposalMass', homeWs: 'VSME-B07.100', formula: 'WasteDirectedToDisposalMass + WasteDivertedToRecycleOrReuseMass' },
  { num: 'EQ-B07-rVol',     out: 'TotalWasteRecycledReusedAndDirectedToDisposalVolume', homeWs: 'VSME-B07.100', formula: 'WasteDirectedToDisposalVolume + WasteDivertedToRecycleOrReuseVolume' },
] as const;

/** The 40 worksheet codes (topology parity with prod). */
export const VSME_WORKSHEETS: readonly string[] = [
  'VSME-B01.000', 'VSME-B01.100', 'VSME-B01.200',
  'VSME-B02.000', 'VSME-B02.100',
  'VSME-B03.000', 'VSME-B03.100', 'VSME-B03.200', 'VSME-B03.300',
  'VSME-B04.000', 'VSME-B04.100',
  'VSME-B05.000', 'VSME-B05.100',
  'VSME-B06.000', 'VSME-B06.100',
  'VSME-B07.000', 'VSME-B07.100', 'VSME-B07.200', 'VSME-B07.300', 'VSME-B07.400',
  'VSME-B08.000', 'VSME-B08.100', 'VSME-B08.200', 'VSME-B08.300',
  'VSME-B09.000', 'VSME-B10.000', 'VSME-B11.000',
  'VSME-C01.000', 'VSME-C02.000',
  'VSME-C03.000', 'VSME-C03.200', 'VSME-C03.300',
  'VSME-C04.000', 'VSME-C05.000', 'VSME-C06.000', 'VSME-C07.000',
  'VSME-C08.000', 'VSME-C08.100', 'VSME-C09.000',
  'VSME-D99.000',
];

/** Fields seeded per HOME worksheet — every BLOCK-gate read symbol on its real
 *  home worksheet (cross-ws reads on their true home), plus a set of warn-gate
 *  read fields for the never-block spot-checks. Equation inputs are supplied
 *  directly to evaluateFormula (in-memory), so equation-only fields are not
 *  seeded. is_required is left default(false): the block-existence-gate proof is
 *  isolated from the separate missing-required-field mechanism. */
export const VSME_FIELDS: Record<string, Array<{ symbol: string; dataType: FType }>> = {
  'VSME-B01.000': [
    { symbol: 'BasisForPreparation', dataType: 'enum' },                        // VSME-CR-B01-01 (block)
    { symbol: 'BasisForReporting', dataType: 'enum' },                          // VSME-CR-B01-02 (block)
  ],
  'VSME-B03.000': [
    { symbol: 'TotalEnergyConsumption', dataType: 'number' },                   // VSME-CR-B03-01 (block)
  ],
  'VSME-B03.200': [
    { symbol: 'GrossScope1GreenhouseGasEmissions', dataType: 'number' },        // VSME-CR-B03-02 (block)
    { symbol: 'GrossLocationBasedScope2GreenhouseGasEmissions', dataType: 'number' }, // VSME-CR-B03-03 (block)
  ],
  'VSME-B03.300': [
    { symbol: 'TotalLocationBasedGreenhouseGasEmissionsIntensityValue', dataType: 'number' }, // VSME-CR-B03-04 (warn)
  ],
  'VSME-B05.000': [
    { symbol: 'SiteLocatedInABiodiversitySensitiveArea', dataType: 'boolean' }, // VSME-CR-B05-01 (warn)
  ],
  'VSME-B06.000': [
    { symbol: 'TotalAmountOfWaterWithdrawnFromAllSites', dataType: 'number' },  // VSME-CR-B06-01 (block)
    { symbol: 'AmountOfWaterWithdrawnAtSitesLocatedInAreasOfHighWaterStress', dataType: 'number' }, // VSME-CR-B06-02 (warn)
  ],
  'VSME-B07.000': [
    { symbol: 'UndertakingAppliesCircularEconomyPrinciples', dataType: 'boolean' }, // VSME-CR-B07-01 (block, gate on B01.000 → cross-ws)
  ],
  'VSME-B08.000': [
    { symbol: 'NumberOfPermanentContractEmployees', dataType: 'number' },       // VSME-CR-B08-01 (warn)
    { symbol: 'NumberOfTemporaryContractEmployees', dataType: 'number' },       // VSME-CR-B08-01 (warn)
  ],
  'VSME-B09.000': [
    { symbol: 'NumberOfRecordableWorkRelatedAccidentsInTheReportingPeriod', dataType: 'number' },              // VSME-CR-B09-01 (block)
    { symbol: 'NumberOfFatalitiesAsAResultOfWorkRelatedInjuriesAndWorkRelatedIllHealth', dataType: 'number' }, // VSME-CR-B09-02 (block)
  ],
  'VSME-B10.000': [
    { symbol: 'EmployeesReceivePayEqualOrAboveMinimumWageDeterminedByNationalLawOrCollectiveAgreement', dataType: 'boolean' }, // VSME-CR-B10-01 (warn)
  ],
  'VSME-B11.000': [
    { symbol: 'TotalNumberOfConvictionsForTheViolationOfAntiCorruptionAndAntiBriberyLaws', dataType: 'number' }, // VSME-CR-B11-01 (warn)
  ],
};

/** Declared enum domains used by the pass-path saves (from the prod dump). */
export const BASIS_FOR_PREPARATION_ENUM: readonly string[] = ['OptionABasicModuleOnlyMember', 'OptionBBasicModuleAndComprehensiveModuleMember'];
export const BASIS_FOR_REPORTING_ENUM: readonly string[] = ['ConsolidatedMember', 'IndividualMember'];

export type VSMEFixture = {
  projectId: string;
  userId: string;
  standardId: string;
  instances: Record<string, string>;
  fieldByWs: Record<string, Record<string, { fieldId: string; dataType: string }>>;
  equationIds: Record<string, string>;
};

export async function seedVSME(sql: postgres.Sql, userId: string): Promise<VSMEFixture> {
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'vsme-harness@test.local')`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('VSME Harness Org', ${'vsme-' + Date.now()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'VSME-PROOF', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version) VALUES ('VSME', 'EFRAG VSME (harness)', '2026-02-01') RETURNING id`;

  const instances: Record<string, string> = {};
  const fieldByWs: Record<string, Record<string, { fieldId: string; dataType: string }>> = {};
  const templateByWs: Record<string, string> = {};

  let wsOrder = 1;
  for (const ws of VSME_WORKSHEETS) {
    const [t] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_templates (standard_id, code, title_de, order_index)
      VALUES (${std.id}, ${ws}, ${ws + ' (harness)'}, ${wsOrder++}) RETURNING id`;
    templateByWs[ws] = t.id;
    const [sec] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_sections (worksheet_template_id, code, title_de)
      VALUES (${t.id}, ${'S-' + ws}, ${'S-' + ws}) RETURNING id`;
    const [inst] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_instances (project_id, worksheet_template_id)
      VALUES (${proj.id}, ${t.id}) RETURNING id`;
    instances[ws] = inst.id;

    fieldByWs[ws] = {};
    let oi = 1;
    for (const f of VSME_FIELDS[ws] ?? []) {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, active, order_index)
        VALUES (${t.id}, ${sec.id}, ${f.symbol}, ${f.symbol}, ${f.dataType}, true, ${oi++})
        RETURNING id`;
      fieldByWs[ws][f.symbol] = { fieldId: row.id, dataType: f.dataType };
    }
  }

  for (const g of VSME_GATES) {
    await sql`
      INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
      VALUES (${templateByWs[g.ws]}, ${g.code}, ${g.code}, ${g.cond}, ${g.sev})`;
  }

  const equationIds: Record<string, string> = {};
  for (const e of VSME_EQUATIONS) {
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO equations (worksheet_template_id, equation_number, formula, output_symbol)
      VALUES (${templateByWs[e.homeWs]}, ${e.num}, ${e.formula}, ${e.out}) RETURNING id`;
    equationIds[e.num] = row.id;
  }

  return { projectId: proj.id, userId, standardId: std.id, instances, fieldByWs, equationIds };
}
