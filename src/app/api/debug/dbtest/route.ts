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
  const regions = [
    'eu-central-1',
    'eu-central-2',
    'eu-west-1',
    'eu-west-2',
    'eu-north-1',
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'ap-southeast-1',
  ];

  const results: Array<{ region: string; ok: boolean; error?: string }> = [];

  for (const region of regions) {
    const url = `postgresql://postgres.${ref}:${password}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
    const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 5 });
    try {
      await sql`select 1`;
      results.push({ region, ok: true });
    } catch (e) {
      const cause = (e as { cause?: { message?: string } }).cause;
      results.push({
        region,
        ok: false,
        error: cause?.message ?? (e instanceof Error ? e.message : String(e)),
      });
    } finally {
      await sql.end({ timeout: 1 });
    }
  }

  const success = results.find((r) => r.ok);
  return NextResponse.json({
    success: success ?? null,
    all: results,
  });
}
