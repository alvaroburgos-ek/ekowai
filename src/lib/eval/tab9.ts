/**
 * DWA-A 138-1 (Oktober 2024) Tabelle 9 — Abflussbeiwerte je Oberflächentyp.
 *
 * Single source for Tab. 9 reference data. Consumers MUST use getTab9Entries()
 * / lookupTab9() — never import TAB9 directly. Each entry is tagged with
 * standard + edition so a future `regulation_tables` DB table can replace the
 * accessor body without moving any caller.
 *
 * cm = C_m (= C_i, design-event runoff coefficient, used by Gl. 2 → A_C).
 * cs = C_s (flood-event runoff coefficient, used by Gl. 10).
 * Group 1 (wasserundurchlässig) & 2 (teildurchlässig) ⇒ paved;
 * Group 3 (durchlässig) ⇒ unpaved.
 */
import { getTable } from './regulation-tables';

export type Tab9Entry = {
  value: string;
  label: string;
  cm: number;
  cs: number;
  kind: 'paved' | 'unpaved';
  group: 1 | 2 | 3;
  /**
   * Provenance. TS-fallback rows always carry the literal 'DWA-A 138-1' /
   * '2024-10'. Registry-backed rows (fromRegistry()) carry the registered
   * RegulationTable's own `standard_code`/`edition` verbatim — minor fix
   * (guideline-to-tool final review): previously hardcoded to the
   * TS-fallback literals even when reading from the registry, so a
   * registered table of a different edition would misreport its own
   * provenance. Widened from the literal union to `string` because
   * `standard_code` uses the DB dash form ('DWA-A-138-1') while the
   * TS-fallback literal uses the display space form ('DWA-A 138-1') — two
   * genuinely different strings, not a typo.
   */
  standard: string;
  edition: string;
};

type Raw = Omit<Tab9Entry, 'kind' | 'standard' | 'edition'>;

const GROUP_1: ReadonlyArray<Raw> = [
  { value: 'dach_schraeg_metall', label: 'Dach Schrägdach – Metall/Glas/Schiefer/Faserzement', cm: 0.9, cs: 1.0, group: 1 },
  { value: 'dach_schraeg_ziegel', label: 'Dach Schrägdach – Ziegel/Abdichtungsbahnen', cm: 0.9, cs: 1.0, group: 1 },
  { value: 'dach_flach_metall', label: 'Dach Flachdach ≤3° – Metall/Glas/Faserzement', cm: 0.9, cs: 1.0, group: 1 },
  { value: 'dach_flach_abdichtung', label: 'Dach Flachdach ≤3° – Abdichtungsbahnen', cm: 0.9, cs: 1.0, group: 1 },
  { value: 'dach_flach_kies', label: 'Dach Flachdach ≤3° – Kiesschüttung', cm: 0.8, cs: 0.8, group: 1 },
  { value: 'gruendach_extensiv_steil', label: 'Gründach – Extensivbegrünung >5°', cm: 0.4, cs: 0.7, group: 1 },
  { value: 'gruendach_intensiv', label: 'Gründach – Intensivbegrünung ≥30cm ≤5°', cm: 0.1, cs: 0.2, group: 1 },
  { value: 'gruendach_extensiv_10', label: 'Gründach – Extensivbegrünung ≥10cm ≤5°', cm: 0.2, cs: 0.4, group: 1 },
  { value: 'gruendach_extensiv_unter10', label: 'Gründach – Extensivbegrünung <10cm', cm: 0.3, cs: 0.5, group: 1 },
  { value: 'beton', label: 'Betonflächen', cm: 0.9, cs: 1.0, group: 1 },
  { value: 'schwarzdecke_asphalt', label: 'Schwarzdecken (Asphalt)', cm: 0.9, cs: 1.0, group: 1 },
  { value: 'pflaster_fugenverguss', label: 'Pflaster mit Fugenverguss / Fugendichtung', cm: 0.8, cs: 1.0, group: 1 },
  { value: 'gleis_feste_fahrbahn', label: 'Oberirdische Gleisanlage, feste Fahrbahn', cm: 0.9, cs: 1.0, group: 1 },
  { value: 'rampe_zum_gebaeude', label: 'Rampen mit Neigung zum Gebäude', cm: 1.0, cs: 1.0, group: 1 },
  { value: 'kunststoff_sportplatz', label: 'Kunststoffflächen von Sportplätzen', cm: 0.5, cs: 1.0, group: 1 },
];

const GROUP_2: ReadonlyArray<Raw> = [
  { value: 'betonsteinpflaster_sand', label: 'Betonsteinpflaster in Sand/Schlacke, Platten', cm: 0.7, cs: 0.9, group: 2 },
  { value: 'pflaster_fuge_15', label: 'Pflaster Fugenanteil >15% / fester Kiesbelag', cm: 0.6, cs: 0.7, group: 2 },
  { value: 'wassergebunden', label: 'Wassergebundene Flächen', cm: 0.7, cs: 0.9, group: 2 },
  { value: 'kiesbelag_locker', label: 'Lockerer Kiesbelag, Schotterrasen', cm: 0.2, cs: 0.3, group: 2 },
  { value: 'verbundstein_sickerfuge', label: 'Verbundsteine mit Sickerfugen, Sicker-/Dränsteine', cm: 0.25, cs: 0.4, group: 2 },
  { value: 'rasengitter_verkehr', label: 'Rasengittersteine mit häufiger Verkehrsbelastung', cm: 0.2, cs: 0.4, group: 2 },
  { value: 'rasengitter_ohne_verkehr', label: 'Rasengittersteine ohne häufige Verkehrsbelastung', cm: 0.1, cs: 0.2, group: 2 },
  { value: 'gleis_schotter_durchlaessig', label: 'Gleisanlage Schotterbau, durchlässiger Unterbau', cm: 0.1, cs: 0.2, group: 2 },
  { value: 'gleis_schotter_schwach', label: 'Gleisanlage Schotterbau, schwach durchl. Unterbau', cm: 0.4, cs: 0.6, group: 2 },
  { value: 'sport_draen_kunststoff', label: 'Sportfläche Dränung – Kunststoff/Kunststoffrasen', cm: 0.1, cs: 0.1, group: 2 },
  { value: 'sport_draen_tenne', label: 'Sportfläche Dränung – Tenne (Hart/Asche/Schlacke)', cm: 0.3, cs: 0.3, group: 2 },
  { value: 'sport_draen_rasen', label: 'Sportfläche Dränung – Rasenfläche', cm: 0.1, cs: 0.1, group: 2 },
];

const GROUP_3: ReadonlyArray<Raw> = [
  { value: 'park_flach', label: 'Parkanlagen/Rasen/Gärten – flaches Gelände', cm: 0.1, cs: 0.2, group: 3 },
  { value: 'park_steil', label: 'Parkanlagen/Rasen/Gärten – steiles Gelände', cm: 0.2, cs: 0.3, group: 3 },
  { value: 'wasserflaeche_eingestaut', label: 'Dauerhaft eingestaute Wasserflächen', cm: 1.0, cs: 1.0, group: 3 },
];

const TAB9: ReadonlyArray<Tab9Entry> = [...GROUP_1, ...GROUP_2, ...GROUP_3].map((r) => ({
  ...r,
  kind: r.group === 3 ? 'unpaved' : 'paved',
  standard: 'DWA-A 138-1',
  edition: '2024-10',
}));

const BY_VALUE: ReadonlyMap<string, Tab9Entry> = new Map(TAB9.map((e) => [e.value, e]));

/** Reads Tab.9 from the registry when a table has been registered (page-level
 * DB load via `registerTables()`); returns null when nothing is registered, OR
 * when a registered table maps to zero VALID rows, so callers fall back to the
 * TS constants (`TAB9`) — identical behavior to an empty/missing DB in either
 * case. Each row is individually validated (cm/cs finite numbers, kind is
 * 'paved'|'unpaved', group is 1|2|3); a malformed jsonb row is skipped with a
 * warning rather than injecting NaN/0 into Gl. 2 / Gl. 10 downstream. */
function fromRegistry(): readonly Tab9Entry[] | null {
  const t = getTable('DWA-A-138-1', undefined, 'TAB9');
  if (!t) return null;
  const rows: Tab9Entry[] = [];
  for (const r of t.rows) {
    const cm = Number(r.values.cm);
    const cs = Number(r.values.cs);
    const kind = r.values.kind;
    const group = Number(r.values.group);
    const validKind = kind === 'paved' || kind === 'unpaved';
    const validGroup = group === 1 || group === 2 || group === 3;
    if (!Number.isFinite(cm) || !Number.isFinite(cs) || !validKind || !validGroup) {
      console.warn('[tab9] invalid regulation_table row skipped', r.row_key);
      continue;
    }
    rows.push({
      value: r.row_key,
      label: r.label_de,
      cm,
      cs,
      kind,
      group: group as 1 | 2 | 3,
      standard: t.standard_code,
      edition: t.edition,
    });
  }
  return rows.length > 0 ? rows : null;
}

export function getTab9Entries(): readonly Tab9Entry[] {
  return fromRegistry() ?? TAB9;
}

export function lookupTab9(value: string): Tab9Entry | undefined {
  const reg = fromRegistry();
  return reg ? reg.find((e) => e.value === value) : BY_VALUE.get(value);
}
