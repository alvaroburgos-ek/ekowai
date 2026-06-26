/**
 * Curated one-click shortlist for the CO₂ Add-activity form.
 *
 * Each entry is keyed by the exact `uba_id` (+ `sourceVersion`) of the factor
 * an SME would actually report against — chosen for the unit SMEs report in:
 *   - diesel / petrol  → per litre (fleet fuel, "Mobile Verbrennung")
 *   - natural gas      → per kWh   (gas bills are in kWh; "Erdgas (Heizwert)")
 *   - heating oil      → per litre ("Heizöl, leicht", stationary combustion)
 *   - grid electricity → per kWh   ("Deutscher Strommix", Scope 2)
 *   - district heat    → per kWh   ("fossiler Fernwärme-Mix", Scope 2)
 *   - R-410A           → per kg    (refrigerant top-up, Scope 1 Kältemittel)
 *
 * NOTE: this list deliberately carries NO coefficients. The scope/unit/kgCo2e
 * are looked up from the loaded catalog at render time so the displayed values
 * stay 100% source-driven. If a uba_id is missing from the catalog the chip is
 * simply not rendered.
 */
export interface ShortlistEntry {
  /** Stable key into the loaded catalog (matched on ubaId + sourceVersion). */
  ubaId: string;
  sourceVersion: string;
  /** Short display labels (German primary / English) for the chip. */
  labelDe: string;
  labelEn: string;
}

export const CO2_SHORTLIST: ShortlistEntry[] = [
  { ubaId: '02_10_01_005_02', sourceVersion: 'v2.1', labelDe: 'Diesel', labelEn: 'Diesel' },
  { ubaId: '02_10_01_001_02', sourceVersion: 'v2.1', labelDe: 'Benzin', labelEn: 'Petrol' },
  { ubaId: '01_10_02_004_01', sourceVersion: 'v2.1', labelDe: 'Erdgas', labelEn: 'Natural gas' },
  { ubaId: '01_10_02_002_02', sourceVersion: 'v2.1', labelDe: 'Heizöl', labelEn: 'Heating oil' },
  { ubaId: '05_20_01_001_01', sourceVersion: 'v2.1', labelDe: 'Strommix', labelEn: 'Grid electricity' },
  { ubaId: '06_20_01_008_01', sourceVersion: 'v2.1', labelDe: 'Fernwärme', labelEn: 'District heat' },
  { ubaId: '04_10_08_011_XX', sourceVersion: 'v2.1', labelDe: 'R-410A', labelEn: 'R-410A' },
];
