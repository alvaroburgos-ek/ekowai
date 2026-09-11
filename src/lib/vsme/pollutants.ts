/**
 * GENERATED FILE — do not edit by hand.
 * Source: EFRAG VSME XBRL Taxonomy 2026-02-01, vsme-definition.xml
 *         (TypeOfPollutantAxis → TypeOfPollutantMember domain-member arcs,
 *          labels from vsme-label-en.xml / vsme-label-de.xml).
 * Regenerate: pnpm tsx scripts/vsme/extract-pollutants.ts "<taxonomyDir>"
 *
 * This is the E-PRTR pollutant list backing the VSME-B04.100 pollutant
 * register (para 32: "the respective amount for each pollutant").
 */

export type PollutantOption = {
  /** XBRL member concept name (e.g. "AmmoniaNH3Member") — persisted in the carrier. */
  value: string;
  labelEn: string;
  labelDe: string;
};

export const POLLUTANTS: readonly PollutantOption[] = [
  { value: "AlachlorMember", labelEn: "Alachlor", labelDe: "Alachlor" },
  { value: "AldrinMember", labelEn: "Aldrin", labelDe: "Aldrin" },
  { value: "AmmoniaNH3Member", labelEn: "Ammonia (NH3)", labelDe: "Ammonia (NH3)" },
  { value: "AnthraceneMember", labelEn: "Anthracene", labelDe: "Anthracene" },
  { value: "ArsenicAndCompoundsAsMember", labelEn: "Arsenic and compounds (As)", labelDe: "Arsenic and compounds (As)" },
  { value: "AsbestosMember", labelEn: "Abestos", labelDe: "Abestos" },
  { value: "AtrazineMember", labelEn: "Atrazine", labelDe: "Atrazine" },
  { value: "BenzeneMember", labelEn: "Benzene", labelDe: "Benzene" },
  { value: "BenzoghiperyleneMember", labelEn: "Benzo(g,h,i)perylene", labelDe: "Benzo(g,h,i)perylene" },
  { value: "BrominatedDiphenylethersPBDEMember", labelEn: "Brominated diphenylethers (PBDE)", labelDe: "Brominated diphenylethers (PBDE)" },
  { value: "CadmiumAndCompoundsCdMember", labelEn: "Cadmium and compounds (Cd)", labelDe: "Cadmium and compounds (Cd)" },
  { value: "CarbonDioxideCO2Member", labelEn: "Carbon dioxide (CO2)", labelDe: "Carbon dioxide (CO2)" },
  { value: "CarbonMonoxideCOMember", labelEn: "Carbon monoxide (CO)", labelDe: "Carbon monoxide (CO)" },
  { value: "ChlordaneMember", labelEn: "Chlordane", labelDe: "Chlordane" },
  { value: "ChlordeconeMember", labelEn: "Chlordecone", labelDe: "Chlordecone" },
  { value: "ChlorfenvinphosMember", labelEn: "Chlorfenvinphos", labelDe: "Chlorfenvinphos" },
  { value: "ChloridesTotalClMember", labelEn: "Chlorides (total Cl)", labelDe: "Chlorides (total Cl)" },
  { value: "ChlorineAndInorganicCompoundsHClMember", labelEn: "Chlorine and inorganic compounds (HCl)", labelDe: "Chlorine and inorganic compounds (HCl)" },
  { value: "ChloroAlkanesC10C13Member", labelEn: "Chloro-alkanes, C10-C13", labelDe: "Chloro-alkanes, C10-C13" },
  { value: "ChlorofluorocarbonsCFCsMember", labelEn: "Chlorofluorocarbons (CFCs)", labelDe: "Chlorofluorocarbons (CFCs)" },
  { value: "ChlorpyrifosMember", labelEn: "Chlorpyrifos", labelDe: "Chlorpyrifos" },
  { value: "ChromiumAndCompoundsCrMember", labelEn: "Chromium and compounds (Cr)", labelDe: "Chromium and compounds (Cr)" },
  { value: "CopperAndCompoundsCuMember", labelEn: "Copper and compounds (Cu)", labelDe: "Copper and compounds (Cu)" },
  { value: "CyanidesTotalCNMember", labelEn: "Cyanides (total CN)", labelDe: "Cyanides (total CN)" },
  { value: "DDTMember", labelEn: "DDT", labelDe: "DDT" },
  { value: "Di2EthylHexylPhthalateDEHPMember", labelEn: "Di-(2-ethyl hexyl) phthalate (DEHP)", labelDe: "Di-(2-ethyl hexyl) phthalate (DEHP)" },
  { value: "EDC12DichloroethaneMember", labelEn: "1,2-dichloroethane (EDC)", labelDe: "1,2-dichloroethane (EDC)" },
  { value: "DichloromethaneDCMMember", labelEn: "Dichloromethane (DCM)", labelDe: "Dichloromethane (DCM)" },
  { value: "DicofolMember", labelEn: "Dicofol", labelDe: "Dicofol" },
  { value: "DieldrinMember", labelEn: "Dieldrin", labelDe: "Dieldrin" },
  { value: "DiuronMember", labelEn: "Diuron", labelDe: "Diuron" },
  { value: "EndosulphanMember", labelEn: "Endosulphan", labelDe: "Endosulphan" },
  { value: "EndrinMember", labelEn: "Endrin", labelDe: "Endrin" },
  { value: "EthylBenzeneMember", labelEn: "Ethyl benzene", labelDe: "Ethyl benzene" },
  { value: "EthyleneOxideMember", labelEn: "Ethylene oxide", labelDe: "Ethylene oxide" },
  { value: "FluorantheneMember", labelEn: "Fluoranthene", labelDe: "Fluoranthene" },
  { value: "FluoridesTotalFMember", labelEn: "Fluorides (total F)", labelDe: "Fluorides (total F)" },
  { value: "FluorineAndInorganicCompoundsHFMember", labelEn: "Fluorine and inorganic compounds (HF)", labelDe: "Fluorine and inorganic compounds (HF)" },
  { value: "HalogenatedOrganicCompoundsAOXMember", labelEn: "Halogenated organic compounds (AOX)", labelDe: "Halogenated organic compounds (AOX)" },
  { value: "HalonsMember", labelEn: "Halons", labelDe: "Halons" },
  { value: "HeptachlorMember", labelEn: "Heptachlor", labelDe: "Heptachlor" },
  { value: "HexabromobiphenylMember", labelEn: "Hexabromobiphenyl", labelDe: "Hexabromobiphenyl" },
  { value: "HexachlorobenzeneHCBMember", labelEn: "Hexachlorobenzene (HCB)", labelDe: "Hexachlorobenzene (HCB)" },
  { value: "HexachlorobutadieneHCBDMember", labelEn: "Hexachlorobutadiene (HCBD)", labelDe: "Hexachlorobutadiene (HCBD)" },
  { value: "HCH123456HexachlorocyclohexaneMember", labelEn: "1,2,3,4,5,6-hexachlorocyclohexane (HCH)", labelDe: "1,2,3,4,5,6-hexachlorocyclohexane (HCH)" },
  { value: "HydrochlorofluorocarbonsHCFCsMember", labelEn: "Hydrochlorofluorocarbons (HCFCs)", labelDe: "Hydrochlorofluorocarbons (HCFCs)" },
  { value: "HydroFluorocarbonsHFCsMember", labelEn: "Hydro-fluorocarbons (HFCs)", labelDe: "Hydro-fluorocarbons (HFCs)" },
  { value: "HydrogenCyanideHCNMember", labelEn: "Hydrogen cyanide (HCN)", labelDe: "Hydrogen cyanide (HCN)" },
  { value: "IsodrinMember", labelEn: "Isodrin", labelDe: "Isodrin" },
  { value: "IsoproturonMember", labelEn: "Isoproturon", labelDe: "Isoproturon" },
  { value: "LeadAndCompoundsPbMember", labelEn: "Lead and compounds (Pb)", labelDe: "Lead and compounds (Pb)" },
  { value: "LindaneMember", labelEn: "Lindane", labelDe: "Lindane" },
  { value: "MercuryAndCompoundsHgMember", labelEn: "Mercury and compounds (Hg)", labelDe: "Mercury and compounds (Hg)" },
  { value: "MethaneCH4Member", labelEn: "Methane (CH4)", labelDe: "Methane (CH4)" },
  { value: "MirexMember", labelEn: "Mirex", labelDe: "Mirex" },
  { value: "NaphthaleneMember", labelEn: "Naphthalene", labelDe: "Naphthalene" },
  { value: "NickelAndCompoundsNiMember", labelEn: "Nickel and compounds (Ni)", labelDe: "Nickel and compounds (Ni)" },
  { value: "NitrogenOxidesNOxNO2Member", labelEn: "Nitrogen oxides (NOx/NO2)", labelDe: "Nitrogen oxides (NOx/NO2)" },
  { value: "NitrousOxideN2OMember", labelEn: "Nitrous oxide (N2O)", labelDe: "Nitrous oxide (N2O)" },
  { value: "NonMethaneVolatileOrganicCompoundsNMVOCMember", labelEn: "Non-methane volatile organic compounds (NMVOC)", labelDe: "Non-methane volatile organic compounds (NMVOC)" },
  { value: "NonylphenolAndNonylphenolEthoxylatesNPNPEsMember", labelEn: "Nonylphenol and Nonylphenol ethoxylates (NP/NPEs)", labelDe: "Nonylphenol and Nonylphenol ethoxylates (NP/NPEs)" },
  { value: "OctylphenolsAndOctylphenolEthoxylatesMember", labelEn: "Octylphenols and Octylphenol ethoxylates", labelDe: "Octylphenols and Octylphenol ethoxylates" },
  { value: "OrganotinCompoundsTotalSnMember", labelEn: "Organotin compounds (total Sn)", labelDe: "Organotin compounds (total Sn)" },
  { value: "ParticulateMatterPMMember", labelEn: "Particulate matter (PM)", labelDe: "Particulate matter (PM)" },
  { value: "PCDDPCDFDioxinsFuransTeqMember", labelEn: "PCDD + PCDF (dioxins + furans) (Teq)", labelDe: "PCDD + PCDF (dioxins + furans) (Teq)" },
  { value: "PentachlorobenzeneMember", labelEn: "Pentachlorobenzene", labelDe: "Pentachlorobenzene" },
  { value: "PentachlorophenolPCPMember", labelEn: "Pentachlorophenol (PCP)", labelDe: "Pentachlorophenol (PCP)" },
  { value: "PerfluorocarbonsPFCsMember", labelEn: "Perfluorocarbons (PFCs)", labelDe: "Perfluorocarbons (PFCs)" },
  { value: "Perfluorohexane1SulfonicAcidPFHxSAndItsSaltsMember", labelEn: "Perfluorohexane-1-sulfonic acid (PFHxS) and its salts", labelDe: "Perfluorohexane-1-sulfonic acid (PFHxS) and its salts" },
  { value: "PerfluorooctanoicAcidPFOAAndItsSaltsMember", labelEn: "Perfluorooctanoic acid (PFOA) and its salts", labelDe: "Perfluorooctanoic acid (PFOA) and its salts" },
  { value: "PhenolsTotalCMember", labelEn: "Phenols (total C)", labelDe: "Phenols (total C)" },
  { value: "PolychlorinatedBiphenylsPCBsMember", labelEn: "Polychlorinated biphenyls (PCBs)", labelDe: "Polychlorinated biphenyls (PCBs)" },
  { value: "PolycyclicAromaticHydrocarbonsPAHsMember", labelEn: "Polycyclic aromatic hydrocarbons (PAHs)", labelDe: "Polycyclic aromatic hydrocarbons (PAHs)" },
  { value: "SimazineMember", labelEn: "Simazine [abstract]", labelDe: "Simazine [abstract]" },
  { value: "SulphurHexafluorideSF6Member", labelEn: "Sulphur hexafluoride (SF6)", labelDe: "Sulphur hexafluoride (SF6)" },
  { value: "SulphurOxidesSOxSO2Member", labelEn: "Sulphur oxides (SOx/SO2)", labelDe: "Sulphur oxides (SOx/SO2)" },
  { value: "TetrachloroethylenePERMember", labelEn: "Tetrachloroethylene (PER)", labelDe: "Tetrachloroethylene (PER)" },
  { value: "TetrachloromethaneTCMMember", labelEn: "Tetrachloromethane (TCM)", labelDe: "Tetrachloromethane (TCM)" },
  { value: "Tetrachloroethane1122Member", labelEn: "1,1,2,2-tetrachloroethane", labelDe: "1,1,2,2-tetrachloroethane" },
  { value: "TolueneMember", labelEn: "Toluene", labelDe: "Toluene" },
  { value: "TotalNitrogenMember", labelEn: "Total nitrogen", labelDe: "Total nitrogen" },
  { value: "TotalOrganicCarbonTOCTotalCOrCOD3Member", labelEn: "Total organic carbon (TOC) (total C or COD/3)", labelDe: "Total organic carbon (TOC) (total C or COD/3)" },
  { value: "TotalPhosphorusMember", labelEn: "Total phosphorus", labelDe: "Total phosphorus" },
  { value: "ToxapheneMember", labelEn: "Toxaphene", labelDe: "Toxaphene" },
  { value: "TributyltinAndCompoundsMember", labelEn: "Tributyltin and compounds", labelDe: "Tributyltin and compounds" },
  { value: "TrichlorobenzenesTCBsAllIsomersMember", labelEn: "Trichlorobenzenes (TCBs) (all isomers)", labelDe: "Trichlorobenzenes (TCBs) (all isomers)" },
  { value: "Trichloroethane111Member", labelEn: "1,1,1-trichloroethane", labelDe: "1,1,1-trichloroethane" },
  { value: "TrichloroethyleneMember", labelEn: "Trichloroethylene", labelDe: "Trichloroethylene" },
  { value: "TrichloromethaneMember", labelEn: "Trichloromethane", labelDe: "Trichloromethane" },
  { value: "TrifluralinMember", labelEn: "Trifluralin", labelDe: "Trifluralin" },
  { value: "TriphenyltinAndCompoundsMember", labelEn: "Triphenyltin and compounds", labelDe: "Triphenyltin and compounds" },
  { value: "VinylChlorideMember", labelEn: "Vinyl chloride", labelDe: "Vinyl chloride" },
  { value: "XylenesMember", labelEn: "Xylenes", labelDe: "Xylenes" },
  { value: "ZincAndCompoundsZnMember", labelEn: "Zinc and compounds (Zn)", labelDe: "Zinc and compounds (Zn)" },
] as const;

const BY_VALUE = new Map(POLLUTANTS.map((p) => [p.value, p]));

export function lookupPollutant(value: string): PollutantOption | undefined {
  return BY_VALUE.get(value);
}

export function pollutantLabel(value: string, locale: 'de' | 'en'): string {
  const p = BY_VALUE.get(value);
  if (!p) return value;
  return locale === 'de' ? p.labelDe : p.labelEn;
}
