import { describe, it, expect } from 'vitest';
import './_setup-env';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

describe('project_collaborators schema', () => {
  it('table exists with the expected columns', async () => {
    const rows = await db.execute<{ column_name: string }>(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'project_collaborators'
      ORDER BY column_name
    `);
    const cols = rows.map((r) => r.column_name);
    expect(cols).toEqual(
      ['created_at', 'id', 'invited_by', 'project_id', 'role', 'user_id'].sort(),
    );
  });

  it('role is constrained to client/designer', async () => {
    const rows = await db.execute<{ check_clause: string }>(sql`
      SELECT cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc ON cc.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'project_collaborators' AND tc.constraint_type = 'CHECK'
        AND cc.check_clause ILIKE '%role%'
    `);
    const joined = rows.map((r) => r.check_clause).join(' ');
    expect(joined).toMatch(/client/);
    expect(joined).toMatch(/designer/);
  });
});
