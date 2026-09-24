/**
 * Plan 3 final wave C, fix round 1 (reviewer, minor 4) — the emitters must write
 * LF, whatever this machine checked the SOURCE out as.
 *
 * `.gitattributes` stores these `.sql` files with LF, but the TS modules they read
 * are checked out with CRLF on Windows, so a multi-line `verbatim_quote` /
 * `verification_quote` carries `\r\n` INTO the emitted SQL. The committed blobs
 * have 0 CRLF (git normalised them on the way in), so the working tree drifted from
 * the blob on four files the moment they were regenerated here — a migration applied
 * straight from this worktree would write `\r\n` into a quote where a fresh checkout
 * writes `\n`.
 *
 * `writeSql()` normalises CRLF→LF at the write boundary. A LONE `\r` inside a quote
 * is CONTENT (the committed blobs carry some) and is deliberately left alone —
 * stripping it would alter a verbatim quote.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeSql } from '../regulation-tables/emit-widget-configs-sql';

describe('writeSql — the emitters write LF (fix round 1, minor 4)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wave-c-eol-'));

  it('CRLF picked up from a CRLF-checked-out source is written as LF', () => {
    const p = join(dir, 'a.sql');
    writeSql(p, "INSERT INTO fields (description) VALUES ('line one\r\nline two');\n");
    const raw = readFileSync(p, 'binary');
    expect(raw).toBe("INSERT INTO fields (description) VALUES ('line one\nline two');\n");
    expect(raw).not.toMatch(/\r\n/);
  });

  it('a LONE \r is CONTENT and survives (never touch a verbatim quote)', () => {
    const p = join(dir, 'b.sql');
    writeSql(p, "SELECT 'a\rb';\n");
    expect(readFileSync(p, 'binary')).toBe("SELECT 'a\rb';\n");
  });

  it('an already-LF payload is written byte-for-byte', () => {
    const p = join(dir, 'c.sql');
    const sql = 'BEGIN;\nSELECT 1;\nCOMMIT;\n';
    writeSql(p, sql);
    expect(readFileSync(p, 'binary')).toBe(sql);
  });
});
