/**
 * Plan 2b Task 6 — `reference` widget config resolution.
 * - REFERENCE_CONFIGS_FALLBACK['rainfall_table_ref'] serves while widget IS NULL
 *   (retired by the Task-5 migration that stamps widget='reference' + ui_config).
 * - DB config wins when widget === 'reference'; any other non-null widget ⇒ null;
 *   an invalid DB ui_config ⇒ null (never a fabricated config).
 * - resolveReferenceRows binds rows_path/id_key/label_key/badge_key to the
 *   carrier; CARRIER_NORMALISERS upgrades a legacy 1-D r_D_n_table carrier first.
 */
import { describe, it, expect } from 'vitest';
import {
  REFERENCE_CONFIGS_FALLBACK,
  CARRIER_NORMALISERS,
  resolveReferenceConfig,
  resolveReferenceRows,
} from '../reference-configs';
import { RETURN_PERIODS } from '../rainfall-tables';

const FB = REFERENCE_CONFIGS_FALLBACK.rainfall_table_ref;

describe('resolveReferenceConfig', () => {
  it('fallback serves rainfall_table_ref only while widget IS NULL', () => {
    expect(resolveReferenceConfig({ symbol: 'rainfall_table_ref', widget: null })).toBe(FB);
    expect(resolveReferenceConfig({ symbol: 'rainfall_table_ref' })).toBe(FB);
    expect(resolveReferenceConfig({ symbol: 'unknown_symbol', widget: null })).toBeNull();
  });

  it('the fallback binds to the KOSTRA carrier exactly as the retired selector did', () => {
    expect(FB).toMatchObject({ carrier_symbol: 'r_D_n_table', rows_path: 'tables', id_key: 'id', label_key: 'name', badge_key: 'source' });
    expect(FB.title).toBe('Regenspendentabelle (Quelle für r_D(n))');
    expect(FB.aria_label).toBe('Regenspendentabelle wählen');
    expect(FB.empty_label).toBe('— Tabelle wählen —');
    expect(FB.badge_labels).toEqual({ 'KOSTRA-DWD-2020': 'KOSTRA', 'DWA-A-531-local': 'DWA-A 531', engineer: 'Ingenieur' });
  });

  it('DB wins: widget=reference with a valid ui_config parses; invalid ⇒ null; other widgets ⇒ null', () => {
    const db = { carrier_symbol: 'other_carrier', rows_path: 'items', id_key: 'key', label_key: 'title' };
    const out = resolveReferenceConfig({ symbol: 'rainfall_table_ref', widget: 'reference', uiConfig: db });
    expect(out).toMatchObject(db);
    expect(out).not.toBe(FB);
    // Missing the carrier binding ⇒ parseFieldConfig throws ⇒ null (no fallback for a non-null widget).
    expect(resolveReferenceConfig({ symbol: 'rainfall_table_ref', widget: 'reference', uiConfig: { title: 'x' } })).toBeNull();
    expect(resolveReferenceConfig({ symbol: 'rainfall_table_ref', widget: 'reference', uiConfig: null })).toBeNull();
    expect(resolveReferenceConfig({ symbol: 'rainfall_table_ref', widget: 'scalar' })).toBeNull();
    expect(resolveReferenceConfig({ symbol: 'rainfall_table_ref', widget: 'register', uiConfig: db })).toBeNull();
  });
});

describe('resolveReferenceRows', () => {
  const TABLES = [
    { id: 'k1', name: 'KOSTRA Krefeld', source: 'KOSTRA-DWD-2020', columns: [...RETURN_PERIODS], rows: [] },
    { id: 'l1', name: 'Lokal 531', source: 'DWA-A-531-local', columns: [...RETURN_PERIODS], rows: [] },
  ];

  it('maps carrier rows to { id, label, badge } through the config keys and badge_labels', () => {
    expect(resolveReferenceRows(FB, { tables: TABLES })).toEqual([
      { id: 'k1', label: 'KOSTRA Krefeld', badge: 'KOSTRA' },
      { id: 'l1', label: 'Lokal 531', badge: 'DWA-A 531' },
    ]);
  });

  it('a legacy 1-D r_D_n_table carrier is normalised through CARRIER_NORMALISERS before rows_path is read', () => {
    expect(CARRIER_NORMALISERS.r_D_n_table).toBeTypeOf('function');
    // Legacy fixture from rainfall-tables.test.ts: top-level { rows } ⇒ one engineer table id "default".
    const rows = resolveReferenceRows(FB, { rows: [{ D_min: 5, r_D_n: 300 }, { D_min: 10, r_D_n: 220 }] });
    expect(rows).toEqual([{ id: 'default', label: 'Standardtabelle', badge: 'Ingenieur' }]);
  });

  it('empty / malformed carriers yield no rows; rows without a string id are skipped; unknown badge passes through raw', () => {
    expect(resolveReferenceRows(FB, undefined)).toEqual([]);
    expect(resolveReferenceRows(FB, null)).toEqual([]);
    expect(resolveReferenceRows(FB, 'nope')).toEqual([]);
    expect(resolveReferenceRows(FB, { tables: [] })).toEqual([]);
    const generic = { carrier_symbol: 'c', rows_path: 'items', id_key: 'key', label_key: 'title', badge_key: 'kind', badge_labels: { a: 'A' } };
    expect(resolveReferenceRows(generic, { items: [{ key: 'x', title: 'X', kind: 'a' }, { key: 'y', title: 'Y', kind: 'zz' }, { key: 3, title: 'bad' }, null, { title: 'no id' }] }))
      .toEqual([{ id: 'x', label: 'X', badge: 'A' }, { id: 'y', label: 'Y', badge: 'zz' }]);
    // No badge_key ⇒ badge null; missing label ⇒ id.
    const noBadge = { carrier_symbol: 'c', rows_path: 'items', id_key: 'key', label_key: 'title' };
    expect(resolveReferenceRows(noBadge, { items: [{ key: 'x' }] })).toEqual([{ id: 'x', label: 'x', badge: null }]);
  });
});
