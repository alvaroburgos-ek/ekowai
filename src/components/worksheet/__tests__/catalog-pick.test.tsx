/**
 * `catalog_pick` register column (2026-10-05) — the FLLNT-12 plant list with the `art` column wired to the picker.
 * The API is stubbed through the component's `fetcher` seam via a RegisterEditor render with a fetch mock on
 * globalThis (the cell defaults to window.fetch when no fetcher is passed).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterEditor, withDefaultRequired, storedRows } from '../register-editor';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { parseFieldConfig } from '@/lib/eval/field-config';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import type { RegisterUiConfig } from '@/lib/eval/field-config';
import type { CatalogHit } from '@/lib/plant-catalog/filter';

const FIELD_ID = 'fixture-plant-list';
const STD = 'FLL-Naturteich';

/** FLLNT-12 plant_species_list exactly as 20260917100810 wrote it, with the STAGED 20261005182000 wiring applied to `art`. */
const CONFIG: RegisterUiConfig = {
  title: 'Pflanzenliste', add_label: '+ Pflanzenart', placement: 'section',
  columns: [
    { key: 'art', label: 'Pflanzenart', type: 'catalog_pick', required: true, pick: { zone_column: 'zone', zones_symbol: 'zonen', propose_group_column: 'plant_group' } },
    { key: 'zone', label: 'Zone / Beckentyp', type: 'text' },
    { key: 'plant_group', label: 'Pflanzengruppe (§10.4.3)', type: 'lookup_key', required: true, lookup: { table_code: 'S10_4_3' } },
    { key: 'area_m2', label: 'Pflanzfläche', type: 'number', unit: 'm²', required: true, min: 0 },
    { key: 'density', label: 'gewählte Dichte', type: 'number', unit: '1/m²', required: true, min: 0 },
    { key: 'count', label: 'Stück', type: 'derived', expr: 'area_m2 * density', unit: 'Stk' },
  ],
};

const HITS: CatalogHit[] = [
  { id: 'h1', scientific_name: 'Myriophyllum spicatum', common_name_de: 'Ähriges Tausendblatt', common_name_en: null, plant_group: 'submerged', depth_zone_code: null, depth_min_cm: 30, depth_max_cm: 150, light: 'sun', height_cm: null, bloom: null, hardiness_zones: null, water_hardness: null, nitrogen_demand: null, origin_regions: null, planting_codes: null, notes: null, aggressive_rhizome: false, aggressive_source: null, source_kind: 'reference_book', source_ref: 'Kircher, T, E', recommended: 'Gruppe Unterwasserpflanzen — Referenz (nicht normativ): Kircher, T, E' },
  { id: 'h2', scientific_name: 'Phragmites australis', common_name_de: 'Gewöhnlicher Schilfrohr', common_name_en: null, plant_group: 'other', depth_zone_code: null, depth_min_cm: null, depth_max_cm: null, light: 'unknown', height_cm: null, bloom: null, hardiness_zones: null, water_hardness: null, nitrogen_demand: null, origin_regions: null, planting_codes: null, notes: 'Tab. 29 Zeile 2', aggressive_rhizome: true, aggressive_source: 'Tab. 29', source_kind: 'guideline', source_ref: 'FLL-GAR-2023 Tab. 29 (printed p. 125)', recommended: 'aggressiv wurzelnd / rhizombildend (FLL-GAR-2023 Tab. 29 (printed p. 125)) — Referenz (nicht normativ): FLL-GAR-2023 Tab. 29 (printed p. 125)' },
];

const fetchMock = vi.fn();
function okJson(body: unknown, status = 200) { return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })); }

function initStore(value?: unknown) {
  act(() => {
    useWorksheetStore.getState().init('fixture-instance', value !== undefined ? { [FIELD_ID]: { type: 'json', value } } : {}, {}, {});
  });
}
function stored() {
  const v = useWorksheetStore.getState().values[FIELD_ID];
  return v?.type === 'json' ? (v.value as { rows: Array<Record<string, unknown>> }) : { rows: [] };
}

beforeEach(() => {
  initStore({ rows: [{ id: 'r1', art: '', zone: 'Regeneration Ost', plant_group: null, area_m2: 10, density: 6 }] });
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('catalog_pick column — config + storage contract', () => {
  it('parseFieldConfig accepts the column type with its pick config', () => {
    const parsed = parseFieldConfig({ widget: 'register', uiConfig: CONFIG, lookup: null, visibleWhen: null });
    expect(parsed.widget).toBe('register');
    const cfg = parsed.ui as RegisterUiConfig;
    expect(cfg.columns[0]).toMatchObject({ type: 'catalog_pick', pick: { zone_column: 'zone', zones_symbol: 'zonen', propose_group_column: 'plant_group' } });
  });
  it('is stored exactly like text (coerce, empty cell, default-required)', () => {
    const prepared = prepareRegisterRows({ rows: [{ id: 'a', art: 'Acorus calamus', zone: 'x' }, { id: 'b', art: 7 }] }, CONFIG.columns, { table: () => undefined, tableRows: () => undefined });
    expect(prepared.rows[0].values.art).toBe('Acorus calamus');
    expect(prepared.rows[1].values.art).toBe('');
    const out = storedRows(prepared, CONFIG.columns, () => false);
    expect(out[1].art).toBe('');
    expect(out[0]).not.toHaveProperty('count');
    const cols = withDefaultRequired([{ key: 'name', label: 'Art', type: 'catalog_pick' }, { key: 'n', label: 'n', type: 'number' }]);
    expect(cols[0].required).toBe(true);
  });
});

describe('catalog_pick column — picker behaviour inside the RegisterEditor', () => {
  const zones = [{ id: 'z', label: 'Regeneration Ost', zone: 'regeneration', area_m2: 40, depth_m: 0.6, technique: 'hydrobotanical_submergent' }];
  const catalogContext = () => ({ zoneLabel: 'Regeneration Ost', maxDepthCm: 60, group: 'submerged' as const, pondType: 'type_III' });
  void zones;

  it('typing writes the text cell as before and queries the API with the row context; picking writes ONLY the species name and shows a proposal', async () => {
    fetchMock.mockImplementation(() => okJson({ rows: HITS, total: 2 }));
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="plant_species_list" config={CONFIG} standardCode={STD} catalogContext={catalogContext} />);
    const input = screen.getByLabelText('Pflanzenart') as HTMLInputElement;
    expect(input).toHaveAttribute('role', 'combobox');
    await user.type(input, 'My');
    expect(stored().rows[0].art).toBe('My');                       // plain text entry keeps working
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const lastUrl = String(fetchMock.mock.calls.at(-1)![0]);
    expect(lastUrl).toBe('/api/plant-catalog?q=My&group=submerged&maxDepthCm=60');
    const list = await screen.findByTestId('catalog-pick-list');
    expect(within(list).getByText('Referenz (nicht normativ)')).toBeInTheDocument();
    // M-2: the list is portalled to document.body with fixed positioning — never a descendant of the register's
    // overflow-x-auto scroll wrapper or of the cell, so that wrapper cannot clip it.
    expect(screen.getByTestId('register-scroll').contains(list)).toBe(false);
    expect(screen.getByTestId('catalog-pick').contains(list)).toBe(false);
    expect(list.parentElement).toBe(document.body);
    expect(list.style.position).toBe('fixed');
    expect(screen.getByTestId('catalog-context')).toHaveTextContent('Kontext: Zone „Regeneration Ost“ · Wassertiefe 60 cm · Gruppe Unterwasserpflanzen · Teichtyp type_III (nur Anzeige)');
    const options = await screen.findAllByTestId('catalog-option');
    expect(options).toHaveLength(2);
    expect(within(options[1]).getByTestId('catalog-aggressive')).toHaveTextContent('aggressiv wurzelnd / rhizombildend (Tab. 29)');
    // the highlighted (first) hit's properties are shown
    expect(screen.getByTestId('catalog-detail')).toHaveTextContent('Pflanztiefe');
    expect(screen.getByTestId('catalog-detail')).toHaveTextContent('30–150 cm');
    await user.click(options[0]);
    const row = stored().rows[0];
    expect(row.art).toBe('Myriophyllum spicatum');
    expect(row.plant_group).toBeNull();                              // the FLL column stays the engineer's own entry
    expect(row).toMatchObject({ zone: 'Regeneration Ost', area_m2: 10, density: 6 });
    expect(screen.getByTestId('catalog-proposal')).toHaveTextContent('Vorschlag Pflanzengruppe (§10.4.3): Unterwasserpflanzen (submerged plants) — nicht übernommen, bitte selbst wählen');
    expect(screen.getByTestId('reselect-plant_group')).toBeInTheDocument();   // the lookup_key still asks for the engineer's choice
  });

  it('keyboard: ArrowDown + Enter picks the highlighted hit; a hit without a printable group shows no proposal', async () => {
    fetchMock.mockImplementation(() => okJson({ rows: HITS, total: 2 }));
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="plant_species_list" config={CONFIG} standardCode={STD} catalogContext={catalogContext} />);
    const input = screen.getByLabelText('Pflanzenart');
    await user.click(input);
    await screen.findAllByTestId('catalog-option');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(stored().rows[0].art).toBe('Phragmites australis');
    expect(screen.queryByTestId('catalog-proposal')).toBeNull();
  });

  it('catalogue unavailable (503) ⇒ notice, free text keeps working, nothing else changes', async () => {
    fetchMock.mockImplementation(() => okJson({ error: 'plant_catalog_not_available' }, 503));
    const user = userEvent.setup();
    render(<RegisterEditor fieldId={FIELD_ID} symbol="plant_species_list" config={CONFIG} standardCode={STD} />);
    await user.type(screen.getByLabelText('Pflanzenart'), 'Typha');
    expect(await screen.findByTestId('catalog-unavailable')).toHaveTextContent('Referenzkatalog noch nicht eingerichtet. Freitext bleibt möglich.');
    expect(stored().rows[0].art).toBe('Typha');
    expect(String(fetchMock.mock.calls.at(-1)![0])).toBe('/api/plant-catalog?q=Typha');   // no context ⇒ no filters
  });

  it('read-only: plain disabled input, no list, no request', async () => {
    render(<RegisterEditor fieldId={FIELD_ID} symbol="plant_species_list" config={CONFIG} standardCode={STD} readOnly />);
    const input = screen.getByLabelText('Pflanzenart');
    expect(input).toBeDisabled();
    act(() => { input.focus(); });
    await new Promise((r) => setTimeout(r, 260));
    expect(screen.queryByTestId('catalog-pick-list')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
