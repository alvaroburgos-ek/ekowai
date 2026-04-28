import { NextResponse } from 'next/server';
import postgres from 'postgres';

// Temporary debug endpoint — remove once production DB connection is healthy.
// Tries multiple Supabase pooler regions to find the right one.
export async function GET() {
  if (!process.env.DEV_AUTOLOGIN_EMAIL) {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }

  const ref = 'vadsmshzebefjreqcicl';
  const password = 'WTm5SYlHvcggVwIc';
  const regions = ['eu-central-1', 'eu-central-2', 'eu-west-1', 'eu-west-2', 'us-east-1'];
  const userVariants = [`postgres.${ref}`, 'postgres'];
  const ports = [6543, 5432];

  type Result = { region: string; user: string; port: number; ok: boolean; error?: string };
  const results: Result[] = [];

  for (const region of regions) {
    for (const user of userVariants) {
      for (const port of ports) {
        const url = `postgresql://${user}:${password}@aws-0-${region}.pooler.supabase.com:${port}/postgres`;
        const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 5 });
        try {
          await sql`select 1`;
          results.push({ region, user, port, ok: true });
        } catch (e) {
          const cause = (e as { cause?: { message?: string } }).cause;
          results.push({
            region,
            user,
            port,
            ok: false,
            error: cause?.message ?? (e instanceof Error ? e.message : String(e)),
          });
        } finally {
          await sql.end({ timeout: 1 }).catch(() => {});
        }
      }
    }
  }

  const success = results.find((r) => r.ok);
  return NextResponse.json({ success: success ?? null, all: results });
}
