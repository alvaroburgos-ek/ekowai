import { describe, it, expect, beforeAll } from 'vitest';
import { parseEnumValues } from '../enums';
import { TAXONOMY_DIR, TAXONOMY_AVAILABLE } from '../_setup';

describe.skipIf(!TAXONOMY_AVAILABLE)('parseEnumValues', () => {
  let rows: ReturnType<typeof parseEnumValues>;
  beforeAll(() => {
    rows = parseEnumValues(TAXONOMY_DIR);
  });
  it('produces members for BasisForPreparation', () => {
    const r = rows.filter((x) => x.enum_name === 'BasisForPreparation');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].label_en.length).toBeGreaterThan(0);
  });
});
