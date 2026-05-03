// @vitest-environment node
import './_setup-env';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { attachSource, detachSource } from '@/lib/actions/citations';
import { saveCalculation } from '@/lib/actions/calculation';
import { db } from '@/lib/db';
import { calculations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getInputValue } from '@/lib/engine/inputs-reader';

describe('citations server actions', () => {
  let calcId: string;
  let originalInputs: any;

  beforeAll(async () => {
    const [row] = await db.select().from(calculations).limit(1);
    if (!row) throw new Error('seed required: pnpm tsx scripts/seed-demo.ts');
    calcId = row.id;
    originalInputs = row.inputs;
  });

  afterAll(async () => {
    // restore original inputs so we don't leave the test calc dirty
    if (calcId) {
      await db
        .update(calculations)
        .set({ inputs: originalInputs })
        .where(eq(calculations.id, calcId));
    }
  });

  it('attaches a label-only source', async () => {
    // Pick the first input symbol from the calc's existing inputs
    const symbols = Object.keys(originalInputs as Record<string, any>);
    if (symbols.length === 0) throw new Error('seed calc has no inputs');
    const symbol = symbols[0];

    const r = await attachSource({
      calcId,
      symbol,
      source: { label: 'Test source 2026-05' },
    });
    expect(r.ok).toBe(true);

    const [row] = await db
      .select()
      .from(calculations)
      .where(eq(calculations.id, calcId));
    const inputs = row.inputs as Record<string, any>;
    expect(inputs[symbol].source).toEqual({ label: 'Test source 2026-05' });
    expect(inputs[symbol].value).toBeDefined();
  });

  it('detaches the source while preserving the value', async () => {
    const symbols = Object.keys(originalInputs as Record<string, any>);
    const symbol = symbols[0];

    const r = await detachSource({ calcId, symbol });
    expect(r.ok).toBe(true);

    const [row] = await db
      .select()
      .from(calculations)
      .where(eq(calculations.id, calcId));
    const inputs = row.inputs as Record<string, any>;
    expect(inputs[symbol].source).toBeUndefined();
    expect(inputs[symbol].value).toBeDefined();
  });

  it('rejects unknown symbol', async () => {
    const r = await attachSource({
      calcId,
      symbol: 'NONEXISTENT_SYMBOL_X',
      source: { label: 'x' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('symbol_not_found');
  });

  it('rejects invalid input shape', async () => {
    const r = await attachSource({
      calcId,
      symbol: 'EW',
      // @ts-expect-error testing zod rejection of bad shape
      source: { foo: 'bar' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid_input');
  });

  // Regression: Plan 6 introduced mixed-cell shape on calculations.inputs.
  // The autosave path used to overwrite calc.inputs with a bare-value record
  // from the client, silently stripping any source attached via attachSource.
  // saveCalculation must merge incoming bare values onto the existing cells
  // and preserve `source` per key.
  it('citation survives autosave (saveCalculation merges, does not overwrite)', async () => {
    const symbols = Object.keys(originalInputs as Record<string, any>);
    if (symbols.length === 0) throw new Error('seed calc has no inputs');
    const symbol = symbols[0];

    // 1. Attach a source to the chosen symbol.
    const labelSource = { label: 'Autosave-Reg-Test 2026-04-29' };
    const ar = await attachSource({ calcId, symbol, source: labelSource });
    expect(ar.ok).toBe(true);

    // Sanity: row now has cell shape with source.
    const [pre] = await db
      .select()
      .from(calculations)
      .where(eq(calculations.id, calcId));
    const preInputs = pre.inputs as Record<string, any>;
    expect(preInputs[symbol].source).toEqual(labelSource);
    const originalValue = getInputValue(preInputs[symbol]);

    // 2. Build a bare-value snapshot the way the client autosave does.
    // Use `getInputValue` to extract bare values from the existing cells.
    const bareSnapshot: Record<string, any> = {};
    for (const [k, v] of Object.entries(preInputs)) {
      bareSnapshot[k] = getInputValue(v as any);
    }

    // 3. Call saveCalculation as the autosave would.
    const sr = await saveCalculation({ calcId, inputs: bareSnapshot });
    expect(sr.ok).toBe(true);

    // 4. Reload — the source MUST still be on the cell, value preserved.
    const [post] = await db
      .select()
      .from(calculations)
      .where(eq(calculations.id, calcId));
    const postInputs = post.inputs as Record<string, any>;
    expect(postInputs[symbol].source).toEqual(labelSource);
    expect(postInputs[symbol].value).toEqual(originalValue);
  });
});
